import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const eservices = await prisma.eService.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    res.json({
      status: 'success',
      data: eservices,
    });
  } catch (error: any) {
    console.error('Error fetching E-Services:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch E-Services',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const eservice = await prisma.eService.findUnique({
      where: { id },
    });

    if (!eservice) {
      res.status(404).json({
        status: 'error',
        message: 'E-Service not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: eservice,
    });
  } catch (error: any) {
    console.error('Error fetching E-Service:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch E-Service',
    });
  }
});

export default router;
