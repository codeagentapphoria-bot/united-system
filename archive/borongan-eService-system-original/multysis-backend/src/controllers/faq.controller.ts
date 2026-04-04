import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  activateFAQ,
  createFAQ,
  deactivateFAQ,
  deleteFAQ,
  getActiveFAQs,
  getFAQ,
  getFAQs,
  getPaginatedFAQs,
  updateFAQ,
} from '../services/faq.service';

export const createFAQController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const faq = await createFAQ(req.body);
    res.status(201).json({
      status: 'success',
      data: faq,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create FAQ',
    });
  }
};

export const getFAQsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string;
    const isActive =
      req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const faqs = await getFAQs({
      search,
      isActive,
    });

    res.status(200).json({
      status: 'success',
      data: faqs,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch FAQs',
    });
  }
};

export const getActiveFAQsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const faqs = await getActiveFAQs(limit);
    res.status(200).json({
      status: 'success',
      data: faqs,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch active FAQs',
    });
  }
};

export const getPaginatedFAQsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;

    const result = await getPaginatedFAQs(page, limit, search);

    res.status(200).json({
      status: 'success',
      data: result.faqs,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch paginated FAQs',
    });
  }
};

export const getFAQController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const faq = await getFAQ(id);
    res.status(200).json({
      status: 'success',
      data: faq,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'FAQ not found',
    });
  }
};

export const updateFAQController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const faq = await updateFAQ(id, req.body);
    res.status(200).json({
      status: 'success',
      data: faq,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update FAQ',
    });
  }
};

export const deleteFAQController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteFAQ(id);
    res.status(200).json({
      status: 'success',
      message: 'FAQ deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to delete FAQ',
    });
  }
};

export const activateFAQController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const faq = await activateFAQ(id);
    res.status(200).json({
      status: 'success',
      data: faq,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to activate FAQ',
    });
  }
};

export const deactivateFAQController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const faq = await deactivateFAQ(id);
    res.status(200).json({
      status: 'success',
      data: faq,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to deactivate FAQ',
    });
  }
};
