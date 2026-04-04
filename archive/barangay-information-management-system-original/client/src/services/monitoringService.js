import api from "@/utils/api";

class MonitoringService {
  /**
   * Get system metrics (CPU, memory, uptime, etc.)
   */
  async getSystemMetrics(token) {
    const config = token ? {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    } : {};
    const response = await api.get('/monitoring/system', config);
    return response.data;
  }

  /**
   * Get storage metrics (disk usage, file counts, etc.)
   */
  async getStorageMetrics(token) {
    const config = token ? {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    } : {};
    const response = await api.get('/monitoring/storage', config);
    return response.data;
  }

  /**
   * Get network metrics (connections, bandwidth, etc.)
   */
  async getNetworkMetrics(token) {
    const response = await api.get('/monitoring/network', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }

  /**
   * Get overall system health status
   */
  async getHealthStatus(token) {
    const config = token ? {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    } : {};
    const response = await api.get('/monitoring/health', config);
    return response.data;
  }

  /**
   * Get database metrics (connections, performance, etc.)
   */
  async getDatabaseMetrics(token) {
    const config = token ? {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    } : {};
    const response = await api.get('/monitoring/database', config);
    return response.data;
  }

  /**
   * Get application metrics (requests, errors, cache, etc.)
   */
  async getApplicationMetrics(token) {
    const response = await api.get('/monitoring/application', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }

  /**
   * Get logs monitoring data (PM2 logs, application logs, error logs)
   */
  async getLogsMetrics(token, lines = 100, logType = 'all') {
    const response = await api.get('/monitoring/logs', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        lines,
        logType
      }
    });
    return response.data;
  }

  /**
   * Get real-time logs stream
   */
  async getLogsStream(token, logType = 'pm2', lines = 50) {
    const response = await api.get('/monitoring/logs/stream', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        logType,
        lines
      }
    });
    return response.data;
  }

  /**
   * Get all monitoring metrics at once
   */
  async getAllMetrics(token) {
    const [
      systemData,
      storageData,
      networkData,
      healthData,
      databaseData,
      applicationData,
      logsData
    ] = await Promise.all([
      this.getSystemMetrics(token),
      this.getStorageMetrics(token),
      this.getNetworkMetrics(token),
      this.getHealthStatus(token),
      this.getDatabaseMetrics(token),
      this.getApplicationMetrics(token),
      this.getLogsMetrics(token)
    ]);

    return {
      system: systemData.data,
      storage: storageData.data,
      network: networkData.data,
      health: healthData.data,
      database: databaseData.data,
      application: applicationData.data,
      logs: logsData.data
    };
  }

  /**
   * Clear all monitoring cache
   */
  async clearCache(token) {
    const response = await api.post('/monitoring/cache/clear', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }

  /**
   * Clear all monitoring logs
   */
  async clearLogs(token) {
    const response = await api.post('/monitoring/logs/clear', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }
}

export const monitoringService = new MonitoringService();
