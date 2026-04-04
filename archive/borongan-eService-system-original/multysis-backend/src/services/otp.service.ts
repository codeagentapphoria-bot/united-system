import { addMinutes } from 'date-fns';
import prisma from '../config/database';
import { sendOtpSms } from './sms.service';

// OTP configuration from environment variables
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);
const OTP_RATE_LIMIT_SECONDS = 60; // Prevent multiple OTPs for same phone within 1 minute

/**
 * Generate a random 6-digit OTP code
 * @returns 6-digit OTP string
 */
export const generateOtp = (): string => {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

/**
 * Create OTP record, send SMS, and return the OTP code
 * @param phoneNumber - Phone number in format 09XXXXXXXXX
 * @returns The generated OTP code
 * @throws Error if rate limit is exceeded or SMS sending fails
 */
export const createOtp = async (phoneNumber: string): Promise<string> => {
  // Check for recent OTP requests (rate limiting)
  const oneMinuteAgo = new Date(Date.now() - OTP_RATE_LIMIT_SECONDS * 1000);
  const recentOtp = await prisma.otpVerification.findFirst({
    where: {
      phoneNumber,
      createdAt: {
        gte: oneMinuteAgo,
      },
      isUsed: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (recentOtp) {
    const secondsRemaining = Math.ceil(
      (OTP_RATE_LIMIT_SECONDS * 1000 - (Date.now() - recentOtp.createdAt.getTime())) / 1000
    );
    throw new Error(`Please wait ${secondsRemaining} seconds before requesting a new OTP.`);
  }

  // Generate OTP
  const otpCode = generateOtp();

  // Calculate expiration time
  const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES);

  // Invalidate any existing unused OTPs for this phone number
  await prisma.otpVerification.updateMany({
    where: {
      phoneNumber,
      isUsed: false,
    },
    data: {
      isUsed: true,
    },
  });

  // Create new OTP record
  await prisma.otpVerification.create({
    data: {
      phoneNumber,
      code: otpCode,
      expiresAt,
      isUsed: false,
      attempts: 0,
      maxAttempts: 3,
    },
  });

  // Send SMS
  try {
    await sendOtpSms(phoneNumber, otpCode);
  } catch (error: any) {
    // If SMS fails, mark OTP as used so it can't be verified
    await prisma.otpVerification.updateMany({
      where: {
        phoneNumber,
        code: otpCode,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });
    throw error;
  }

  return otpCode;
};

/**
 * Verify OTP code with attempt tracking
 * @param phoneNumber - Phone number in format 09XXXXXXXXX
 * @param code - OTP code to verify
 * @returns true if OTP is valid, false otherwise
 * @throws Error if max attempts exceeded or OTP is expired
 */
export const verifyOtp = async (phoneNumber: string, code: string): Promise<boolean> => {
  // Find the most recent unused OTP for this phone number
  const otpRecord = await prisma.otpVerification.findFirst({
    where: {
      phoneNumber,
      isUsed: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otpRecord) {
    throw new Error('No active OTP found. Please request a new OTP.');
  }

  // Check if OTP is expired
  if (new Date() > otpRecord.expiresAt) {
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });
    throw new Error('OTP has expired. Please request a new OTP.');
  }

  // Check if max attempts exceeded
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });
    throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
  }

  // Verify the code
  if (otpRecord.code !== code) {
    // Increment attempts
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: {
        attempts: otpRecord.attempts + 1,
      },
    });

    const remainingAttempts = otpRecord.maxAttempts - (otpRecord.attempts + 1);
    throw new Error(
      `Invalid OTP code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Maximum attempts exceeded.'}`
    );
  }

  // Mark OTP as used
  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  return true;
};

/**
 * Cleanup expired OTPs (background job)
 * This should be called periodically to clean up old OTP records
 */
export const cleanupExpiredOtps = async (): Promise<void> => {
  const now = new Date();
  const result = await prisma.otpVerification.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { isUsed: true }],
    },
  });

  if (result.count > 0) {
    console.log(`🧹 Cleaned up ${result.count} expired/used OTP records`);
  }
};
