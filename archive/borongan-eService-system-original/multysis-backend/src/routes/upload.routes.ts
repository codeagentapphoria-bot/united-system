import { Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { AuthRequest, verifyAdmin, verifyToken } from '../middleware/auth';
import {
  getFilePath,
  getFileUrl,
  uploadDocument,
  uploadProfilePicture,
} from '../middleware/upload';

const router = Router();

// Upload profile picture
router.post(
  '/subscribers/:id/profile-picture',
  verifyAdmin,
  uploadProfilePicture.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
        return;
      }

      const subscriberGateway = await (prisma as any).subscriber.findUnique({
        where: { id: req.params.id },
        include: {
          nonCitizen: true,
        },
      });

      if (!subscriberGateway) {
        res.status(404).json({
          status: 'error',
          message: 'Subscriber not found',
        });
        return;
      }

      const filePath = getFilePath(req.file.filename, 'image');
      const fileUrl = getFileUrl(filePath);

      // Update profile picture in NonCitizen if type is SUBSCRIBER
      if (subscriberGateway.type === 'SUBSCRIBER' && subscriberGateway.nonCitizen) {
        // Delete old profile picture if it exists
        if (subscriberGateway.nonCitizen.profilePicture) {
          try {
            const oldFilePath = subscriberGateway.nonCitizen.profilePicture.startsWith('/')
              ? subscriberGateway.nonCitizen.profilePicture
              : `/${subscriberGateway.nonCitizen.profilePicture}`;
            const fullPath = path.join(process.cwd(), oldFilePath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`Deleted old subscriber profile picture: ${oldFilePath}`);
            }
          } catch (error) {
            console.error('Error deleting old subscriber profile picture:', error);
            // Continue with update even if file deletion fails
          }
        }

        await (prisma as any).nonCitizen.update({
          where: { id: subscriberGateway.nonCitizen.id },
          data: { profilePicture: filePath }, // Store relative path in DB
        });
      } else {
        res.status(400).json({
          status: 'error',
          message: 'Cannot update profile picture for citizen subscribers',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: {
          url: fileUrl, // Return full URL in response
          filename: req.file.filename,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to upload profile picture',
      });
    }
  }
);

// Get profile picture
router.get(
  '/subscribers/:id/profile-picture',
  verifyToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const subscriberGateway = await (prisma as any).subscriber.findUnique({
        where: { id: req.params.id },
        include: {
          citizen: { select: { citizenPicture: true } },
          nonCitizen: { select: { profilePicture: true } },
        },
      });

      if (!subscriberGateway) {
        res.status(404).json({
          status: 'error',
          message: 'Subscriber not found',
        });
        return;
      }

      // Get profile picture from appropriate source
      let profilePicture: string | null = null;
      if (subscriberGateway.type === 'CITIZEN' && subscriberGateway.citizen) {
        profilePicture = subscriberGateway.citizen.citizenPicture;
      } else if (subscriberGateway.type === 'SUBSCRIBER' && subscriberGateway.nonCitizen) {
        profilePicture = subscriberGateway.nonCitizen.profilePicture;
      }

      res.status(200).json({
        status: 'success',
        data: {
          url: profilePicture ? getFileUrl(profilePicture) : null,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to fetch profile picture',
      });
    }
  }
);

// Upload transaction document (temporary - for new transactions)
router.post(
  '/transactions/documents',
  verifyToken,
  uploadDocument.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
        return;
      }

      const filePath = getFilePath(req.file.filename, 'document');
      const fileUrl = getFileUrl(filePath);

      res.status(200).json({
        status: 'success',
        data: {
          url: fileUrl,
          filename: req.file.filename,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to upload document',
      });
    }
  }
);

// Upload transaction document (for existing transaction - admin only)
router.post(
  '/transactions/:id/document',
  verifyAdmin,
  uploadDocument.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
        return;
      }

      const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id },
      });

      if (!transaction) {
        res.status(404).json({
          status: 'error',
          message: 'Transaction not found',
        });
        return;
      }

      const filePath = getFilePath(req.file.filename, 'document');
      const fileUrl = getFileUrl(filePath);

      // TODO: Store document path in transaction or create a separate document table
      // For now, we'll add it to remarks or create a document reference

      res.status(200).json({
        status: 'success',
        data: {
          url: fileUrl, // Return full URL in response
          filename: req.file.filename,
          transactionId: transaction.id,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to upload document',
      });
    }
  }
);

export default router;
