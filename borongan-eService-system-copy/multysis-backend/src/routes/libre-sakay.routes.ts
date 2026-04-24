import { Router } from 'express';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  getFleetStatsController, getFleetLocationsController,
  getBusesController, getBusByIdController, getAvailableRoutesController,
  getAvailableDriversController, createBusController, updateBusController,
  deleteBusController, assignDriverController, unassignDriverController,
  getRoutesController, getRouteByIdController, getRouteWithStopsController,
  createRouteController, updateRouteController, deleteRouteController,
  getDriversController, getDriverByIdController, createDriverController,
  updateDriverController, deleteDriverController, deleteDriverPermanentController,
  assignBusController, unassignBusController,
  getAllStopsController, getStopsByRouteController, createStopController,
  updateStopController, deleteStopController, assignStopToRouteController,
  removeStopFromRouteController, reorderStopsController, replaceStopInRouteController,
  getRoutesForStopController,
  getDashboardStatsController,
  getRideLogsController, getRidesTrendController, deleteRideLogController,
  reviewRideLogController,
  verifyResidentController,
} from '../controllers/libre-sakay.controller';
import {
  getBusesValidation, getBusByIdValidation, createBusValidation,
  updateBusValidation, deleteBusValidation, assignDriverValidation,
  getRoutesValidation, createRouteValidation, updateRouteValidation,
  getDriversValidation, createDriverValidation, updateDriverValidation,
  createStopValidation, updateStopValidation, assignStopToRouteValidation,
  reorderStopsValidation, replaceStopInRouteValidation,
  reviewRideLogValidation,
} from '../validations/libre-sakay.schema';

const router = Router();

router.use(verifyAdmin); // All routes require admin auth

// Dashboard
router.get('/dashboard/stats', getDashboardStatsController);

// Fleet
router.get('/fleet/stats', getFleetStatsController);
router.get('/fleet/locations', getFleetLocationsController);

// Buses
router.get('/buses', validate(getBusesValidation), getBusesController);
router.get('/buses/available/routes', getAvailableRoutesController);
router.get('/buses/available/drivers', getAvailableDriversController);
router.get('/buses/:id', validate(getBusByIdValidation), getBusByIdController);
router.post('/buses', validate(createBusValidation), createBusController);
router.patch('/buses/:id', validate(updateBusValidation), updateBusController);
router.delete('/buses/:id', validate(deleteBusValidation), deleteBusController);
router.post('/buses/:busId/drivers', validate(assignDriverValidation), assignDriverController);
router.delete('/buses/:busId/drivers', validate(assignDriverValidation), unassignDriverController);

// Routes
router.get('/routes', validate(getRoutesValidation), getRoutesController);
router.get('/routes/:id', getRouteByIdController);
router.get('/routes/:id/stops', getStopsByRouteController);
router.post('/routes', validate(createRouteValidation), createRouteController);
router.patch('/routes/:id', validate(updateRouteValidation), updateRouteController);
router.delete('/routes/:id', deleteRouteController);

// Drivers
router.get('/drivers', validate(getDriversValidation), getDriversController);
router.get('/drivers/:id', getDriverByIdController);
router.post('/drivers', validate(createDriverValidation), createDriverController);
router.patch('/drivers/:id', validate(updateDriverValidation), updateDriverController);
// NOTE: permanent delete MUST be before /drivers/:id to avoid Express matching it first
router.delete('/drivers/:id/permanent', deleteDriverPermanentController);
router.delete('/drivers/:id', deleteDriverController);
router.post('/drivers/:driverId/buses', assignBusController);
router.delete('/drivers/:driverId/buses', unassignBusController);

// Stops
router.get('/stops', getAllStopsController);
router.get('/stops/:stopId/routes', getRoutesForStopController);
router.post('/stops', validate(createStopValidation), createStopController);
router.patch('/stops/:id', validate(updateStopValidation), updateStopController);
router.delete('/stops/:id', deleteStopController);
router.post('/routes/:routeId/stops', validate(assignStopToRouteValidation), assignStopToRouteController);
router.delete('/routes/:routeId/stops', removeStopFromRouteController);
router.patch('/routes/:routeId/stops/reorder', validate(reorderStopsValidation), reorderStopsController);
router.patch('/routes/:routeId/stops/replace', validate(replaceStopInRouteValidation), replaceStopInRouteController);

// Ride Logs
router.get('/ride-logs', getRideLogsController);
router.get('/ride-logs/trend', getRidesTrendController);
router.delete('/ride-logs/:id', deleteRideLogController);
router.patch('/ride-logs/:id/review', validate(reviewRideLogValidation), reviewRideLogController);

// Resident Verification (Libre Sakay admin checks if a resident is approved)
router.get('/residents/verify/:residentId', verifyResidentController);

export default router;
