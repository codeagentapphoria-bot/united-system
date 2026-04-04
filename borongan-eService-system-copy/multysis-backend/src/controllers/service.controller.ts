import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  activateService,
  createService,
  deactivateService,
  deleteService,
  getActiveServices,
  getAllCategories,
  getService,
  getServiceByCode,
  getServices,
  updateService,
} from '../services/service.service';
import { emitNewService, emitServiceDelete, emitServiceUpdate } from '../services/socket.service';
import { getAppointmentAvailability } from '../services/transaction.service';

export const createServiceController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = await createService(req.body);

    // Emit WebSocket event for new service
    emitNewService({
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description || undefined,
      category: service.category || undefined,
      isActive: service.isActive,
      createdAt: service.createdAt,
    });

    res.status(201).json({
      status: 'success',
      data: service,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create service',
    });
  }
};

export const getServicesController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 10;
    const search = _req.query.search as string;
    const category = _req.query.category as string;
    const isActive =
      _req.query.isActive === 'true' ? true : _req.query.isActive === 'false' ? false : undefined;

    const result = await getServices({ search, category, isActive }, { page, limit });

    res.status(200).json({
      status: 'success',
      data: result.services,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch services',
    });
  }
};

export const getActiveServicesController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const displayInSidebar =
      _req.query.displayInSidebar === 'true'
        ? true
        : _req.query.displayInSidebar === 'false'
          ? false
          : undefined;
    const displayInSubscriberTabs =
      _req.query.displayInSubscriberTabs === 'true'
        ? true
        : _req.query.displayInSubscriberTabs === 'false'
          ? false
          : undefined;

    const services = await getActiveServices({
      displayInSidebar,
      displayInSubscriberTabs,
    });

    res.status(200).json({
      status: 'success',
      data: services,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch active services',
    });
  }
};

export const getServiceController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = await getService(req.params.id);
    res.status(200).json({
      status: 'success',
      data: service,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Service not found',
    });
  }
};

export const getServiceByCodeController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const service = await getServiceByCode(req.params.code.toUpperCase());
    res.status(200).json({
      status: 'success',
      data: service,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Service not found',
    });
  }
};

export const updateServiceController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = await updateService(req.params.id, req.body);

    // Emit WebSocket event for service update
    emitServiceUpdate(req.params.id, {
      code: service.code,
      name: service.name,
      description: service.description || undefined,
      category: service.category || undefined,
      isActive: service.isActive,
      updatedAt: service.updatedAt,
    });

    res.status(200).json({
      status: 'success',
      data: service,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update service',
    });
  }
};

export const deleteServiceController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteService(req.params.id);

    // Emit WebSocket event for service deletion
    emitServiceDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Service deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to delete service',
    });
  }
};

export const activateServiceController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = await activateService(req.params.id);

    // Emit WebSocket event for service activation
    emitServiceUpdate(req.params.id, {
      code: service.code,
      name: service.name,
      description: service.description || undefined,
      category: service.category || undefined,
      isActive: true,
      updatedAt: service.updatedAt,
    });

    res.status(200).json({
      status: 'success',
      data: service,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to activate service',
    });
  }
};

export const deactivateServiceController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const service = await deactivateService(req.params.id);

    // Emit WebSocket event for service deactivation
    emitServiceUpdate(req.params.id, {
      code: service.code,
      name: service.name,
      description: service.description || undefined,
      category: service.category || undefined,
      isActive: false,
      updatedAt: service.updatedAt,
    });

    res.status(200).json({
      status: 'success',
      data: service,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to deactivate service',
    });
  }
};

export const getCategoriesController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await getAllCategories();
    res.status(200).json({
      status: 'success',
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch categories',
    });
  }
};

export const getAppointmentAvailabilityController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: serviceId } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const availability = await getAppointmentAvailability(serviceId, startDate, endDate);

    res.status(200).json({
      status: 'success',
      data: availability,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get appointment availability',
    });
  }
};
