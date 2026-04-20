import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getFleetStats,
  getBuses, getBusById, getAvailableRoutes, getAvailableDrivers,
  createBus, updateBus, deleteBus, assignDriverToBus, unassignDriverFromBus,
  getRoutes, getRouteById, getRouteWithStops, createRoute, updateRoute, deleteRoute,
  getDrivers, getDriverById, createDriver, updateDriver, deleteDriver,
  assignBusToDriver, unassignBusFromDriver,
  getAllStops, getStopsByRoute, createStop, updateStop, deleteStop,
  assignStopToRoute, removeStopFromRoute, reorderStopsInRoute,
  getDashboardStats, getRideLogs, getRidesTrend, deleteRideLog,
} from '../services/libre-sakay.service';

// Helper to send paginated response
const paginated = (data: any[], total: number, page: number, limit: number, res: Response) => {
  res.status(200).json({
    status: 'success',
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

// =============================================================================
// FLEET
// =============================================================================

export const getFleetStatsController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await getFleetStats();
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// =============================================================================
// BUSES
// =============================================================================

export const getBusesController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await getBuses(page, limit);
    paginated(result.data, result.total, result.page, result.limit, res);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getBusByIdController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bus = await getBusById(req.params.id);
    if (!bus) { res.status(404).json({ status: 'error', message: 'Bus not found' }); return; }
    res.status(200).json({ status: 'success', data: bus });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAvailableRoutesController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const routes = await getAvailableRoutes();
    res.status(200).json({ status: 'success', data: routes });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAvailableDriversController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const drivers = await getAvailableDrivers();
    res.status(200).json({ status: 'success', data: drivers });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createBusController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { plate_number, capacity, route_id } = req.body;
    const bus = await createBus(plate_number, capacity, route_id);
    res.status(201).json({ status: 'success', data: bus });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const updateBusController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bus = await updateBus(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: bus });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteBusController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteBus(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const assignDriverController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { driver_id } = req.body;
    await assignDriverToBus(req.params.busId, driver_id);
    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const unassignDriverController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { driver_id } = req.body;
    await unassignDriverFromBus(req.params.busId, driver_id);
    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// =============================================================================
// ROUTES
// =============================================================================

export const getRoutesController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await getRoutes(page, limit);
    paginated(result.data, result.total, result.page, result.limit, res);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRouteByIdController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const route = await getRouteById(req.params.id);
    if (!route) { res.status(404).json({ status: 'error', message: 'Route not found' }); return; }
    res.status(200).json({ status: 'success', data: route });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRouteWithStopsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const route = await getRouteWithStops(req.params.id);
    if (!route) { res.status(404).json({ status: 'error', message: 'Route not found' }); return; }
    res.status(200).json({ status: 'success', data: route });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createRouteController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const route = await createRoute(name, description);
    res.status(201).json({ status: 'success', data: route });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const updateRouteController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const route = await updateRoute(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: route });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteRouteController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteRoute(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// =============================================================================
// DRIVERS
// =============================================================================

export const getDriversController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await getDrivers(page, limit);
    paginated(result.data, result.total, result.page, result.limit, res);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDriverByIdController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driver = await getDriverById(req.params.id);
    if (!driver) { res.status(404).json({ status: 'error', message: 'Driver not found' }); return; }
    res.status(200).json({ status: 'success', data: driver });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createDriverController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, full_name, phone, password } = req.body;
    const driver = await createDriver(email, full_name, phone, password);
    res.status(201).json({ status: 'success', data: driver });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const updateDriverController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driver = await updateDriver(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: driver });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteDriverController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteDriver(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const assignBusController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bus_id } = req.body;
    await assignBusToDriver(req.params.driverId, bus_id);
    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const unassignBusController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bus_id } = req.body;
    await unassignBusFromDriver(req.params.driverId, bus_id);
    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// =============================================================================
// STOPS
// =============================================================================

export const getAllStopsController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stops = await getAllStops();
    res.status(200).json({ status: 'success', data: stops });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getStopsByRouteController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stops = await getStopsByRoute(req.params.routeId);
    res.status(200).json({ status: 'success', data: stops });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createStopController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, latitude, longitude } = req.body;
    const stop = await createStop(name, latitude, longitude);
    res.status(201).json({ status: 'success', data: stop });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const updateStopController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stop = await updateStop(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: stop });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteStopController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteStop(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const assignStopToRouteController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stop_id } = req.body;
    await assignStopToRoute(req.params.routeId, stop_id);
    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const removeStopFromRouteController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stop_id } = req.body;
    await removeStopFromRoute(req.params.routeId, stop_id);
    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const reorderStopsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stop_ids } = req.body;
    await reorderStopsInRoute(req.params.routeId, stop_ids);
    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// =============================================================================
// DASHBOARD STATS
// =============================================================================

export const getDashboardStatsController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await getDashboardStats();
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// =============================================================================
// RIDE LOGS
// =============================================================================

export const getRideLogsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const filters = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      route_id: req.query.route_id as string | undefined,
      driver_id: req.query.driver_id as string | undefined,
      bus_id: req.query.bus_id as string | undefined,
    };
    const result = await getRideLogs(page, limit, filters);
    paginated(result.data, result.total, result.page, result.limit, res);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRidesTrendController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const trend = await getRidesTrend(days);
    res.status(200).json({ status: 'success', data: trend });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteRideLogController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteRideLog(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};
