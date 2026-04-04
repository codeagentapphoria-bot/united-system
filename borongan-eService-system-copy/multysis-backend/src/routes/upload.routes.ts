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

// Upload profile picture during self-registration (public — no auth required)
// Rate-limited at the route mount level (uploadLimiter in index.ts)
router.post(
  '/registration/profile-picture',
  uploadProfilePicture.single('file'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!_req.file) {
        res.status(400).json({ status: 'error', message: 'No file uploaded' });
        return;
      }
      const filePath = getFilePath(_req.file.filename, 'image');
      const fileUrl = getFileUrl(filePath);
      res.status(200).json({ status: 'success', data: { url: fileUrl, path: filePath } });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message || 'Failed to upload photo' });
    }
  }
);

// Upload profile picture
router.post(
  '/residents/:id/profile-picture',
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

      const resident = await prisma.resident.findUnique({
        where: { id: req.params.id },
      });

      if (!resident) {
        res.status(404).json({
          status: 'error',
          message: 'Resident not found',
        });
        return;
      }

      const filePath = getFilePath(req.file.filename, 'image');
      const fileUrl = getFileUrl(filePath);

      // Delete old profile picture if it exists
      if ((resident as any).profilePicture) {
        try {
          const oldFilePath = (resident as any).profilePicture.startsWith('/')
            ? (resident as any).profilePicture
            : `/${(resident as any).profilePicture}`;
          const fullPath = path.join(process.cwd(), oldFilePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
        }
      }

      await prisma.resident.update({
        where: { id: resident.id },
        data: { profilePicture: filePath } as any,
      });

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
  '/residents/:id/profile-picture',
  verifyToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const resident = await prisma.resident.findUnique({
        where: { id: req.params.id },
      });

      if (!resident) {
        res.status(404).json({
          status: 'error',
          message: 'Resident not found',
        });
        return;
      }

      const profilePicture: string | null = (resident as any).profilePicture ?? null;

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

// Upload household image (portal self-registration)
router.post(
  '/households/image',
  verifyToken,
  uploadProfilePicture.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ status: 'error', message: 'No file uploaded' });
        return;
      }
      const filePath = getFilePath(req.file.filename, 'image');
      const fileUrl  = getFileUrl(filePath);
      res.status(200).json({ status: 'success', data: { url: fileUrl, path: filePath } });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message || 'Failed to upload image' });
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
