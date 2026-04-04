import express from 'express';
import { allUsers } from '../middlewares/auth.js';
import { getSystemMetrics, getStorageMetrics, getNetworkMetrics, getHealthStatus, getDatabaseMetrics, getApplicationMetrics, getLogsMetrics, getLogsStream, clearMonitoringCache, clearMonitoringLogs } from '../controllers/monitoringControllers.js';
import { smartCache } from '../middlewares/smartCache.js';

const router = express.Router();

/**
 * @route   GET /api/monitoring/system
 * @desc    Get system metrics (CPU, memory, uptime, etc.)
 * @access  Private (Admin only)
 */
router.get('/system', smartCache(30), ...allUsers, getSystemMetrics);

/**
 * @route   GET /api/monitoring/storage
 * @desc    Get storage metrics (disk usage, file counts, etc.)
 * @access  Private (Admin only)
 */
router.get('/storage', smartCache(60), ...allUsers, getStorageMetrics);

/**
 * @route   GET /api/monitoring/network
 * @desc    Get network metrics (connections, bandwidth, etc.)
 * @access  Private (Admin only)
 */
router.get('/network', smartCache(30), ...allUsers, getNetworkMetrics);

/**
 * @route   GET /api/monitoring/health
 * @desc    Get overall system health status
 * @access  Private (Admin only)
 */
router.get('/health', smartCache(15), ...allUsers, getHealthStatus);

/**
 * @route   GET /api/monitoring/database
 * @desc    Get database metrics (connections, performance, etc.)
 * @access  Private (Admin only)
 */
router.get('/database', smartCache(60), ...allUsers, getDatabaseMetrics);

/**
 * @route   GET /api/monitoring/application
 * @desc    Get application metrics (requests, errors, cache, etc.)
 * @access  Private (Admin only)
 */
router.get('/application', smartCache(30), ...allUsers, getApplicationMetrics);

/**
 * @route   GET /api/monitoring/logs
 * @desc    Get logs monitoring data (PM2 logs, application logs, error logs)
 * @access  Private (Admin only)
 */
router.get('/logs', smartCache(10), ...allUsers, getLogsMetrics);

/**
 * @route   GET /api/monitoring/logs/stream
 * @desc    Get real-time logs stream
 * @access  Private (Admin only)
 */
router.get('/logs/stream', ...allUsers, getLogsStream);

/**
 * @route   POST /api/monitoring/cache/clear
 * @desc    Clear all monitoring cache
 * @access  Private (Admin only)
 */
router.post('/cache/clear', ...allUsers, clearMonitoringCache);

/**
 * @route   POST /api/monitoring/logs/clear
 * @desc    Clear all application and PM2 logs
 * @access  Private (Admin only)
 */
router.post('/logs/clear', ...allUsers, clearMonitoringLogs);

export default router;
