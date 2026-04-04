import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
import { testRedisConnection } from '../config/redis.js';
import { cacheUtils } from '../config/redis.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get system metrics (CPU, memory, uptime, etc.)
 */
export const getSystemMetrics = async (req, res) => {
  try {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const uptime = os.uptime();
    const loadAverage = os.loadavg();
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();
    const nodeVersion = process.version;
    const pid = process.pid;

    // Calculate CPU usage percentage
    const cpuUsage = process.cpuUsage();
    const cpuUsagePercent = ((cpuUsage.user + cpuUsage.system) / 1000000).toFixed(2);

    const metrics = {
      system: {
        hostname,
        platform,
        architecture: arch,
        nodeVersion,
        processId: pid
      },
      cpu: {
        model: cpus[0].model,
        cores: cpus.length,
        usage: {
          percent: cpuUsagePercent,
          loadAverage: {
            '1min': loadAverage[0].toFixed(2),
            '5min': loadAverage[1].toFixed(2),
            '15min': loadAverage[2].toFixed(2)
          }
        }
      },
      memory: {
        total: {
          bytes: totalMemory,
          formatted: formatBytes(totalMemory)
        },
        used: {
          bytes: usedMemory,
          formatted: formatBytes(usedMemory),
          percent: ((usedMemory / totalMemory) * 100).toFixed(2)
        },
        free: {
          bytes: freeMemory,
          formatted: formatBytes(freeMemory),
          percent: ((freeMemory / totalMemory) * 100).toFixed(2)
        }
      },
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting system metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system metrics',
      error: error.message
    });
  }
};

/**
 * Get storage metrics (disk usage, file counts, etc.)
 */
export const getStorageMetrics = async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const logsDir = path.join(__dirname, '../../logs');
    
    // Get disk usage
    const diskUsage = await getDiskUsage();
    
    // Get uploads directory info
    const uploadsInfo = await getDirectoryInfo(uploadsDir);
    
    // Get logs directory info
    const logsInfo = await getDirectoryInfo(logsDir);
    
    // Get database size
    const dbSize = await getDatabaseSize();

    const metrics = {
      disk: diskUsage,
      directories: {
        uploads: uploadsInfo,
        logs: logsInfo
      },
      database: dbSize,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting storage metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get storage metrics',
      error: error.message
    });
  }
};

/**
 * Get network metrics (connections, bandwidth, etc.)
 */
export const getNetworkMetrics = async (req, res) => {
  try {
    const networkInterfaces = os.networkInterfaces();
    const connections = [];
    
    // Get network interface information
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          connections.push({
            interface: name,
            address: iface.address,
            netmask: iface.netmask,
            mac: iface.mac,
            family: iface.family
          });
        }
      }
    }

    // Get process network info
    const processMemory = process.memoryUsage();
    
    const metrics = {
      interfaces: connections,
      process: {
        memory: {
          rss: formatBytes(processMemory.rss),
          heapTotal: formatBytes(processMemory.heapTotal),
          heapUsed: formatBytes(processMemory.heapUsed),
          external: formatBytes(processMemory.external)
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting network metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get network metrics',
      error: error.message
    });
  }
};

/**
 * Get overall system health status
 */
export const getHealthStatus = async (req, res) => {
  try {
    const healthChecks = {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      disk: await checkDiskHealth(),
      memory: await checkMemoryHealth(),
      uptime: await checkUptimeHealth()
    };

    // Determine overall status based on the worst status among all checks
    // Priority: critical > unhealthy > degraded > warning > healthy
    const statuses = Object.values(healthChecks).map(check => check.status);
    
    let overallStatus = 'healthy';
    if (statuses.includes('critical')) {
      overallStatus = 'critical';
    } else if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    } else if (statuses.includes('warning')) {
      overallStatus = 'warning';
    }

    const metrics = {
      status: overallStatus,
      checks: healthChecks,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting health status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get health status',
      error: error.message
    });
  }
};

/**
 * Get database metrics (connections, performance, etc.)
 */
export const getDatabaseMetrics = async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get database size
    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as size_bytes
    `);
    
    // Get connection info
    const connectionResult = await client.query(`
      SELECT 
        count(*) as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      FROM pg_stat_activity
      WHERE state = 'active'
    `);
    
    // Get table statistics
    const tableStatsResult = await client.query(`
      SELECT schemaname, relname as tablename, n_tup_ins as inserts, n_tup_upd as updates, n_tup_del as deletes
      FROM pg_stat_user_tables
      ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
      LIMIT 10
    `);
    
    client.release();

    const metrics = {
      size: {
        formatted: sizeResult.rows[0].size,
        bytes: parseInt(sizeResult.rows[0].size_bytes)
      },
      connections: {
        active: parseInt(connectionResult.rows[0].active_connections),
        max: parseInt(connectionResult.rows[0].max_connections),
        usage: ((connectionResult.rows[0].active_connections / connectionResult.rows[0].max_connections) * 100).toFixed(2)
      },
      tables: tableStatsResult.rows,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting database metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database metrics',
      error: error.message
    });
  }
};

/**
 * Get application metrics (requests, errors, cache, etc.)
 */
export const getApplicationMetrics = async (req, res) => {
  try {
    // Get Redis cache stats
    const redisStats = await getRedisStats();
    
    // Get application info
    const appInfo = {
      nodeVersion: process.version,
      platform: os.platform(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      },
      memory: process.memoryUsage(),
      pid: process.pid
    };

    const metrics = {
      application: appInfo,
      cache: redisStats,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting application metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get application metrics',
      error: error.message
    });
  }
};

// Helper functions

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

async function getDiskUsage() {
  try {
    // Use a more compatible approach for disk usage
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Try to get disk usage using df command (works on most Unix-like systems)
    const { stdout } = await execAsync('df -B1 /');
    const lines = stdout.trim().split('\n');
    const dataLine = lines[1]; // Skip header line
    
    if (dataLine) {
      const parts = dataLine.split(/\s+/);
      const total = parseInt(parts[1]);
      const used = parseInt(parts[2]);
      const free = parseInt(parts[3]);
      
      return {
        total: {
          bytes: total,
          formatted: formatBytes(total)
        },
        used: {
          bytes: used,
          formatted: formatBytes(used),
          percent: ((used / total) * 100).toFixed(2)
        },
        free: {
          bytes: free,
          formatted: formatBytes(free),
          percent: ((free / total) * 100).toFixed(2)
        }
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting disk usage:', error);
    // Fallback: return basic info without disk usage
    return {
      total: { bytes: 0, formatted: 'Unknown' },
      used: { bytes: 0, formatted: 'Unknown', percent: '0' },
      free: { bytes: 0, formatted: 'Unknown', percent: '0' }
    };
  }
}

async function getDirectoryInfo(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return null;
    }
    
    let totalSize = 0;
    let fileCount = 0;
    
    // Recursive function to count files and calculate size
    const countFiles = async (currentPath) => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isFile()) {
            try {
              const fileStats = await fs.stat(fullPath);
              totalSize += fileStats.size;
              fileCount++;
            } catch (error) {
              // Skip files that can't be accessed
              continue;
            }
          } else if (entry.isDirectory()) {
            // Recursively count files in subdirectories
            await countFiles(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be accessed
        return;
      }
    };
    
    await countFiles(dirPath);
    
    return {
      path: dirPath,
      fileCount,
      totalSize: {
        bytes: totalSize,
        formatted: formatBytes(totalSize)
      }
    };
  } catch (error) {
    logger.error(`Error getting directory info for ${dirPath}:`, error);
    return null;
  }
}

async function getDatabaseSize() {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as size_bytes
    `);
    client.release();
    
    return {
      formatted: result.rows[0].size,
      bytes: parseInt(result.rows[0].size_bytes)
    };
  } catch (error) {
    logger.error('Error getting database size:', error);
    return null;
  }
}

async function checkDatabaseHealth() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    return { status: 'unhealthy', message: `Database connection failed: ${error.message}` };
  }
}

async function checkRedisHealth() {
  try {
    const isConnected = await testRedisConnection();
    return { 
      status: isConnected ? 'healthy' : 'unhealthy', 
      message: isConnected ? 'Redis connection successful' : 'Redis connection failed' 
    };
  } catch (error) {
    return { status: 'unhealthy', message: `Redis check failed: ${error.message}` };
  }
}

async function checkDiskHealth() {
  try {
    const diskUsage = await getDiskUsage();
    if (!diskUsage) {
      return { status: 'unknown', message: 'Could not check disk usage' };
    }
    
    const usagePercent = parseFloat(diskUsage.used.percent);
    if (usagePercent > 90) {
      return { status: 'critical', message: `Disk usage is ${usagePercent}%` };
    } else if (usagePercent > 80) {
      return { status: 'warning', message: `Disk usage is ${usagePercent}%` };
    } else {
      return { status: 'healthy', message: `Disk usage is ${usagePercent}%` };
    }
  } catch (error) {
    return { status: 'unhealthy', message: `Disk check failed: ${error.message}` };
  }
}

async function checkMemoryHealth() {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercent = (usedMemory / totalMemory) * 100;
    
    if (usagePercent > 90) {
      return { status: 'critical', message: `Memory usage is ${usagePercent.toFixed(2)}%` };
    } else if (usagePercent > 80) {
      return { status: 'warning', message: `Memory usage is ${usagePercent.toFixed(2)}%` };
    } else {
      return { status: 'healthy', message: `Memory usage is ${usagePercent.toFixed(2)}%` };
    }
  } catch (error) {
    return { status: 'unhealthy', message: `Memory check failed: ${error.message}` };
  }
}

async function checkUptimeHealth() {
  try {
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    
    if (days < 1) {
      return { status: 'warning', message: 'System recently restarted' };
    } else {
      return { status: 'healthy', message: `System uptime: ${formatUptime(uptime)}` };
    }
  } catch (error) {
    return { status: 'unhealthy', message: `Uptime check failed: ${error.message}` };
  }
}

async function getRedisStats() {
  try {
    const isConnected = await testRedisConnection();
    if (!isConnected) {
      return { connected: false, message: 'Redis not connected' };
    }
    
    // Get basic Redis info using getStats method
    const stats = await cacheUtils.getStats();
    return {
      connected: true,
      info: stats?.info || 'Redis info not available',
      keys: stats?.keys || 0
    };
  } catch (error) {
    return { connected: false, message: `Redis error: ${error.message}` };
  }
}

/**
 * Get logs monitoring data (PM2 logs, application logs, error logs)
 */
export const getLogsMetrics = async (req, res) => {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    const { lines = 100, logType = 'all' } = req.query;
    
    // Get PM2 logs
    const pm2Logs = await getPM2Logs(parseInt(lines));
    
    // Get application logs
    const applicationLogs = await getApplicationLogs(logsDir, parseInt(lines));
    
    // Get error logs
    const errorLogs = await getErrorLogs(logsDir, parseInt(lines));
    
    // Get log file statistics
    const logStats = await getLogFileStats(logsDir);
    
    const metrics = {
      pm2: pm2Logs,
      application: applicationLogs,
      errors: errorLogs,
      statistics: logStats,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting logs metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get logs metrics',
      error: error.message
    });
  }
};

/**
 * Get real-time logs stream
 */
export const getLogsStream = async (req, res) => {
  try {
    const { logType = 'pm2', lines = 50 } = req.query;
    
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let logData = '';
    
    switch (logType) {
      case 'pm2':
        logData = await getPM2Logs(parseInt(lines));
        break;
      case 'application':
        const logsDir = path.join(__dirname, '../../logs');
        logData = await getApplicationLogs(logsDir, parseInt(lines));
        break;
      case 'errors':
        const errorLogsDir = path.join(__dirname, '../../logs');
        logData = await getErrorLogs(errorLogsDir, parseInt(lines));
        break;
      default:
        logData = await getPM2Logs(parseInt(lines));
    }

    res.write(JSON.stringify({
      success: true,
      data: logData,
      timestamp: new Date().toISOString()
    }));
    
    res.end();
  } catch (error) {
    logger.error('Error streaming logs:', error);
    res.write(JSON.stringify({
      success: false,
      message: 'Failed to stream logs',
      error: error.message
    }));
    res.end();
  }
};

// Helper functions for logs

async function getPM2Logs(lines = 100) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Get PM2 logs
    const { stdout: pm2Out } = await execAsync(`pm2 logs --lines ${lines} --nostream`);
    const { stdout: pm2Err } = await execAsync(`pm2 logs --err --lines ${lines} --nostream`);
    
    return {
      output: pm2Out.split('\n').filter(line => line.trim()),
      errors: pm2Err.split('\n').filter(line => line.trim()),
      totalLines: lines
    };
  } catch (error) {
    logger.error('Error getting PM2 logs:', error);
    return {
      output: [],
      errors: [`Error getting PM2 logs: ${error.message}`],
      totalLines: 0
    };
  }
}

async function getApplicationLogs(logsDir, lines = 100) {
  try {
    // Get the current date for daily rotated files
    const today = new Date().toISOString().split('T')[0];
    const logFiles = [
      `application-${today}.log`,
      'application.log',
      'combined.log',
      'server.log'
    ];
    
    const logs = [];
    
    for (const logFile of logFiles) {
      const logPath = path.join(logsDir, logFile);
      try {
        const logContent = await readLogFile(logPath, lines);
        if (logContent.length > 0) {
          logs.push({
            file: logFile,
            lines: logContent,
            count: logContent.length
          });
        }
      } catch (error) {
        // Skip files that don't exist or can't be read
        continue;
      }
    }
    
    return logs;
  } catch (error) {
    logger.error('Error getting application logs:', error);
    return [];
  }
}

async function getErrorLogs(logsDir, lines = 100) {
  try {
    // Get the current date for daily rotated files
    const today = new Date().toISOString().split('T')[0];
    const errorFiles = [
      `error-${today}.log`,
      'error.log',
      'exceptions.log',
      'rejections.log'
    ];
    
    const logs = [];
    
    for (const errorFile of errorFiles) {
      const logPath = path.join(logsDir, errorFile);
      try {
        const logContent = await readLogFile(logPath, lines);
        if (logContent.length > 0) {
          logs.push({
            file: errorFile,
            lines: logContent,
            count: logContent.length
          });
        }
      } catch (error) {
        // Skip files that don't exist or can't be read
        continue;
      }
    }
    
    return logs;
  } catch (error) {
    logger.error('Error getting error logs:', error);
    return [];
  }
}

async function readLogFile(filePath, lines = 100) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return [];
    }
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    const allLines = fileContent.split('\n').filter(line => line.trim());
    
    // Return the last N lines
    return allLines.slice(-lines);
  } catch (error) {
    // Only log error if it's not a "file not found" error
    if (error.code !== 'ENOENT') {
      logger.error(`Error reading log file ${filePath}:`, error);
    }
    return [];
  }
}

async function getLogFileStats(logsDir) {
  try {
    // Get the current date for daily rotated files
    const today = new Date().toISOString().split('T')[0];
    const logFiles = [
      `application-${today}.log`,
      'application.log',
      `error-${today}.log`,
      'error.log',
      'combined.log',
      'server.log',
      'exceptions.log',
      'rejections.log'
    ];
    
    const stats = [];
    
    for (const logFile of logFiles) {
      const logPath = path.join(logsDir, logFile);
      try {
        const fileStats = await fs.stat(logPath);
        const fileContent = await fs.readFile(logPath, 'utf8');
        const lineCount = fileContent.split('\n').length - 1;
        
        stats.push({
          file: logFile,
          size: {
            bytes: fileStats.size,
            formatted: formatBytes(fileStats.size)
          },
          lines: lineCount,
          lastModified: fileStats.mtime,
          exists: true
        });
      } catch (error) {
        stats.push({
          file: logFile,
          size: { bytes: 0, formatted: '0 Bytes' },
          lines: 0,
          lastModified: null,
          exists: false
        });
      }
    }
    
    return stats;
  } catch (error) {
    logger.error('Error getting log file stats:', error);
    return [];
  }
}

/**
 * Clear all monitoring cache
 */
export const clearMonitoringCache = async (req, res) => {
  try {
    const { cacheUtils } = await import('../config/redis.js');
    
    // Clear all monitoring-related cache keys
    const patterns = [
      'smart:/api/monitoring/*',
      'monitoring:*',
      'api:*/monitoring/*'
    ];
    
    let clearedCount = 0;
    
    for (const pattern of patterns) {
      try {
        const keys = await cacheUtils.keys(pattern);
        if (keys.length > 0) {
          await cacheUtils.del(...keys);
          clearedCount += keys.length;
          logger.info(`Cleared ${keys.length} cache keys for pattern: ${pattern}`);
        }
      } catch (error) {
        logger.warn(`Error clearing cache pattern ${pattern}:`, error.message);
      }
    }
    
    logger.info(`Cache clearing completed. Total keys cleared: ${clearedCount}`);
    
    res.json({
      success: true,
      message: 'Monitoring cache cleared successfully',
      data: {
        clearedKeys: clearedCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error clearing monitoring cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear monitoring cache',
      error: error.message
    });
  }
};

/**
 * Clear all monitoring logs
 */
export const clearMonitoringLogs = async (req, res) => {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    let clearedFiles = 0;
    let clearedSize = 0;
    
    // Get current log files before clearing
    const logFiles = await fs.readdir(logsDir);
    
    // Clear application logs (Winston logs)
    const applicationLogs = logFiles.filter(file => 
      file.startsWith('application-') || 
      file.startsWith('error-') || 
      file === 'combined.log' ||
      file === 'server.log' ||
      file === 'exceptions.log' ||
      file === 'rejections.log'
    );
    
    for (const logFile of applicationLogs) {
      try {
        const filePath = path.join(logsDir, logFile);
        const stats = await fs.stat(filePath);
        await fs.unlink(filePath);
        clearedFiles++;
        clearedSize += stats.size;
        logger.info(`Cleared log file: ${logFile} (${stats.size} bytes)`);
      } catch (error) {
        logger.warn(`Error clearing log file ${logFile}:`, error.message);
      }
    }
    
    // Clear PM2 logs
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('pm2 flush');
      logger.info('PM2 logs flushed successfully');
    } catch (error) {
      logger.warn('Error flushing PM2 logs:', error.message);
    }
    
    // Clear PM2 daemon log
    try {
      const pm2LogPath = path.join(process.env.HOME || '/home/ubuntu', '.pm2/pm2.log');
      if (await fs.access(pm2LogPath).then(() => true).catch(() => false)) {
        const stats = await fs.stat(pm2LogPath);
        await fs.writeFile(pm2LogPath, '');
        clearedFiles++;
        clearedSize += stats.size;
        logger.info(`Cleared PM2 daemon log (${stats.size} bytes)`);
      }
    } catch (error) {
      logger.warn('Error clearing PM2 daemon log:', error.message);
    }
    
    logger.info(`Log clearing completed. Files cleared: ${clearedFiles}, Size freed: ${clearedSize} bytes`);
    
    res.json({
      success: true,
      message: 'Monitoring logs cleared successfully',
      data: {
        clearedFiles,
        clearedSize,
        clearedSizeFormatted: formatBytes(clearedSize),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error clearing monitoring logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear monitoring logs',
      error: error.message
    });
  }
};
