import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Socket, Server as SocketIOServer } from 'socket.io';
import prisma from '../config/database';
import { addDevLog } from '../services/dev.service';
import type {
  SocketUser,
  TransactionNotePayload,
  TypingIndicatorPayload,
} from '../types/socket.types';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be set in environment variables and be at least 32 characters long'
  );
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
  subscribedTransactions?: Set<string>;
  subscribedSubscribers?: Set<string>;
}

// Store active connections: userId -> Set of socketIds
const activeConnections = new Map<string, Set<string>>();

// Rate limiting tracking: userId -> { lastEventTime, eventCount }
interface RateLimitTracker {
  lastEventTime: number;
  eventCount: number;
}

const typingRateLimits = new Map<string, RateLimitTracker>();
const noteRateLimits = new Map<string, RateLimitTracker>();

// Rate limit constants
const TYPING_MAX_EVENTS_PER_SECOND = 5;
const NOTE_MAX_EVENTS_PER_MINUTE = 10;
const TYPING_RESET_INTERVAL = 1000; // 1 second
const NOTE_RESET_INTERVAL = 60000; // 1 minute

// Helper function to check rate limit
const checkRateLimit = (
  userId: string,
  rateLimitMap: Map<string, RateLimitTracker>,
  maxEvents: number,
  resetInterval: number
): boolean => {
  const now = Date.now();
  const tracker = rateLimitMap.get(userId);

  if (!tracker) {
    rateLimitMap.set(userId, { lastEventTime: now, eventCount: 1 });
    return true;
  }

  // Reset if interval has passed
  if (now - tracker.lastEventTime > resetInterval) {
    tracker.lastEventTime = now;
    tracker.eventCount = 1;
    return true;
  }

  // Check if limit exceeded
  if (tracker.eventCount >= maxEvents) {
    return false;
  }

  tracker.eventCount++;
  return true;
};

export const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Try to get token from multiple sources:
      // 1. Auth object (for explicit token passing)
      // 2. Authorization header
      // 3. Cookies (for HTTP-only cookie auth)
      let token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      // Treat empty string as no token (frontend passes empty string when using cookies)
      if (!token || (typeof token === 'string' && token.trim() === '')) {
        token = undefined;
      }

      // If no token in auth/header, try to read from cookies
      if (!token && socket.handshake.headers.cookie) {
        const { getAccessTokenCookieName } = await import('../utils/cookies');
        const cookieName = getAccessTokenCookieName();
        const cookies = socket.handshake.headers.cookie.split(';').reduce(
          (acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string>
        );
        token = cookies[cookieName];
      }

      if (!token || (typeof token === 'string' && token.trim() === '')) {
        addDevLog('error', 'Socket authentication failed: No token provided', {
          socketId: socket.id,
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
        });
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email?: string;
        phoneNumber?: string;
        type: 'admin' | 'resident' | 'dev';
      };

      // Verify user exists and is active
      if (decoded.type === 'dev') {
        // Dev users don't exist in database, allow connection
        socket.user = {
          id: decoded.id,
          type: 'dev',
          email: decoded.email,
        };

        // Initialize subscription tracking
        socket.subscribedTransactions = new Set();
        socket.subscribedSubscribers = new Set();

        next();
        return;
      }

      if (decoded.type === 'admin') {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });
        if (!user) {
          addDevLog('error', 'Socket authentication failed: Admin user not found', {
            userId: decoded.id,
            socketId: socket.id,
            ip: socket.handshake.address,
          });
          return next(new Error('Authentication error: User not found'));
        }
      } else {
        const resident = await prisma.resident.findUnique({
          where: { id: decoded.id },
        });
        if (!resident) {
          addDevLog('error', 'Socket authentication failed: Resident not found', {
            residentId: decoded.id,
            socketId: socket.id,
            ip: socket.handshake.address,
          });
          return next(new Error('Authentication error: Resident not found'));
        }

        // Check if resident account is active
        if (resident.status !== 'active') {
          addDevLog('error', 'Socket authentication failed: Account not active', {
            residentId: decoded.id,
            status: resident.status,
            socketId: socket.id,
            ip: socket.handshake.address,
          });
          return next(new Error('Authentication error: Account not active'));
        }
      }

      socket.user = {
        id: decoded.id,
        type: decoded.type,
        email: decoded.email,
        phoneNumber: decoded.phoneNumber,
      };

      // Initialize subscription tracking
      socket.subscribedTransactions = new Set();
      socket.subscribedSubscribers = new Set();

      next();
    } catch (error: any) {
      // Log socket authentication errors
      addDevLog('error', 'Socket authentication error', {
        socketId: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
        error: error.message,
      });
      next(new Error(`Authentication error: ${error.message}`));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      addDevLog('error', 'Socket connection rejected: No user data', {
        socketId: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
      });
      socket.disconnect();
      return;
    }

    const userId = socket.user.id;
    const userType = socket.user.type;

    // Track connection
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId)!.add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-based rooms
    if (userType === 'admin') {
      socket.join('admins');
    } else if (userType === 'dev') {
      socket.join('developers');
    } else {
      socket.join('subscribers');
    }

    console.log(`✅ Socket connected: ${userType} ${userId} (${socket.id})`);

    // Handle transaction subscription
    socket.on('subscribe:transaction', (transactionId: string) => {
      socket.join(`transaction:${transactionId}`);
      socket.subscribedTransactions?.add(transactionId);
      console.log(`📌 User ${userId} subscribed to transaction ${transactionId}`);
    });

    // Handle transaction unsubscription
    socket.on('unsubscribe:transaction', (transactionId: string) => {
      socket.leave(`transaction:${transactionId}`);
      socket.subscribedTransactions?.delete(transactionId);
      console.log(`📌 User ${userId} unsubscribed from transaction ${transactionId}`);
    });

    // Handle subscriber subscription (for admins viewing subscriber)
    socket.on('subscribe:subscriber', (subscriberId: string) => {
      if (userType === 'admin') {
        socket.join(`subscriber:${subscriberId}`);
        socket.subscribedSubscribers?.add(subscriberId);
        console.log(`📌 Admin ${userId} subscribed to subscriber ${subscriberId}`);
      } else {
        socket.emit('error', { message: 'Only admins can subscribe to subscribers' });
      }
    });

    // Handle subscriber unsubscription
    socket.on('unsubscribe:subscriber', (subscriberId: string) => {
      socket.leave(`subscriber:${subscriberId}`);
      socket.subscribedSubscribers?.delete(subscriberId);
      console.log(`📌 User ${userId} unsubscribed from subscriber ${subscriberId}`);
    });

    // Handle transaction note (chat message) with rate limiting
    socket.on('transaction:note', async (data: TransactionNotePayload) => {
      try {
        // Rate limiting check
        if (
          !checkRateLimit(userId, noteRateLimits, NOTE_MAX_EVENTS_PER_MINUTE, NOTE_RESET_INTERVAL)
        ) {
          socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
          return;
        }

        // Verify user has access to this transaction
        const transaction = await prisma.transaction.findUnique({
          where: { id: data.transactionId },
        });

        if (!transaction) {
          socket.emit('error', { message: 'Transaction not found' });
          return;
        }

        // Verify ownership/access
        if (userType === 'resident' && transaction.residentId !== userId) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create transaction note
        const note = await prisma.transactionNote.create({
          data: {
            transactionId: data.transactionId,
            message: data.message,
            senderType: userType === 'admin' ? 'ADMIN' : 'RESIDENT',
            senderId: userId,
            isInternal: data.isInternal || false,
            isRead: false,
          },
        });

        // Emit to all users subscribed to this transaction
        io.to(`transaction:${data.transactionId}`).emit('transaction:note:new', {
          id: note.id,
          transactionId: note.transactionId,
          message: note.message,
          senderType: note.senderType,
          senderId: note.senderId,
          isInternal: note.isInternal,
          isRead: note.isRead,
          createdAt: note.createdAt.toISOString(),
        });

        // Also notify the other party if not internal
        if (!data.isInternal) {
          const targetUserId = userType === 'admin' ? transaction.residentId : null;

          if (targetUserId) {
            io.to(`user:${targetUserId}`).emit('notification:new', {
              type: 'transaction_note',
              message: 'New message on your transaction',
              transactionId: data.transactionId,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error: any) {
        console.error('Error handling transaction note:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator with rate limiting
    socket.on('transaction:typing', (data: TypingIndicatorPayload) => {
      // Rate limiting check
      if (
        !checkRateLimit(
          userId,
          typingRateLimits,
          TYPING_MAX_EVENTS_PER_SECOND,
          TYPING_RESET_INTERVAL
        )
      ) {
        // Silently ignore typing events that exceed rate limit
        return;
      }

      // Broadcast typing indicator to other users in the transaction room
      socket.to(`transaction:${data.transactionId}`).emit('transaction:typing', {
        userId,
        userType,
        isTyping: data.isTyping,
      });
    });

    // Handle disconnect with cleanup
    socket.on('disconnect', () => {
      // Remove from typing indicators
      // (Typing indicators are ephemeral, so no explicit cleanup needed)

      // Remove from active connections
      if (activeConnections.has(userId)) {
        activeConnections.get(userId)!.delete(socket.id);
        if (activeConnections.get(userId)!.size === 0) {
          activeConnections.delete(userId);
          // Clean up rate limit trackers when user disconnects
          typingRateLimits.delete(userId);
          noteRateLimits.delete(userId);
        }
      }

      console.log(`❌ Socket disconnected: ${userType} ${userId} (${socket.id})`);
    });
  });

  return io;
};

// Helper function to emit transaction updates
export const emitTransactionUpdate = (
  io: SocketIOServer,
  transactionId: string,
  update: {
    status?: string;
    paymentStatus?: string;
    appointmentStatus?: string;
    updatedAt: Date;
  }
): void => {
  io.to(`transaction:${transactionId}`).emit('transaction:update', {
    transactionId,
    ...update,
    updatedAt: update.updatedAt.toISOString(),
  });
};

// Helper function to emit subscriber updates
export const emitSubscriberUpdate = (
  io: SocketIOServer,
  subscriberId: string,
  update: {
    status?: string;
    updatedAt: Date;
  }
): void => {
  io.to(`subscriber:${subscriberId}`).emit('subscriber:update', {
    subscriberId,
    ...update,
    updatedAt: update.updatedAt.toISOString(),
  });

  // Also notify the subscriber themselves
  io.to(`user:${subscriberId}`).emit('notification:new', {
    type: 'subscriber_update',
    message: 'Your account status has been updated',
    subscriberId,
    ...update,
    timestamp: update.updatedAt.toISOString(),
  });
};

// Helper function to emit new transaction notification
export const emitNewTransaction = (
  io: SocketIOServer,
  transaction: {
    id: string;
    subscriberId: string;
    transactionId: string;
    serviceId: string;
    status?: string;
  }
): void => {
  // Notify admins
  io.to('admins').emit('transaction:new', transaction);

  // Notify the subscriber
  io.to(`user:${transaction.subscriberId}`).emit('notification:new', {
    type: 'transaction_created',
    message: 'Your transaction has been created',
    transactionId: transaction.id,
    timestamp: new Date().toISOString(),
  });
};

// Helper function to get active user count
export const getActiveUserCount = (): number => {
  return activeConnections.size;
};
