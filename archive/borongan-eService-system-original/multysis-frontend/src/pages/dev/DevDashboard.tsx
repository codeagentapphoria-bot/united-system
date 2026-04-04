// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { FiDatabase, FiFileText, FiLogOut, FiRefreshCw, FiServer, FiWifi, FiWifiOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/hooks/use-toast';

// Services
import { devService, type DatabaseInfo, type SystemInfo, type SystemLogs } from '@/services/api/dev.service';

// Types
import type { DevLogPayload } from '@/types/socket.types';

// Utils
import { cn } from '@/lib/utils';

export const DevDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  const { isConnected, onDevSystemInfoUpdate, onDevDatabaseInfoUpdate, onDevLogUpdate } = useSocket();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [logs, setLogs] = useState<SystemLogs | null>(null);
  const [realtimeLogs, setRealtimeLogs] = useState<DevLogPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [systemData, dbData, logsData] = await Promise.all([
        devService.getSystemInfo(),
        devService.getDatabaseInfo(),
        devService.getSystemLogs(50),
      ]);

      setSystemInfo(systemData);
      setDatabaseInfo(dbData);
      setLogs(logsData);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set up socket event listeners for real-time updates
  useEffect(() => {
    // Subscribe to system info updates
    const cleanupSystemInfo = onDevSystemInfoUpdate((data) => {
      setSystemInfo({
        nodeVersion: data.nodeVersion,
        platform: data.platform,
        arch: data.arch,
        uptime: data.uptime,
        memory: data.memory,
        env: data.env,
        pid: data.pid,
        cwd: data.cwd,
      });
    });

    // Subscribe to database info updates
    const cleanupDatabaseInfo = onDevDatabaseInfoUpdate((data) => {
      setDatabaseInfo({
        connected: data.connected,
        provider: data.provider,
        poolSize: data.poolSize,
        activeConnections: data.activeConnections,
        message: data.message,
        error: data.error,
      });
    });

    // Subscribe to log updates
    const cleanupLogs = onDevLogUpdate((data) => {
      setRealtimeLogs((prev) => {
        // Keep only the last 100 logs to prevent memory issues
        const newLogs = [data, ...prev].slice(0, 100);
        return newLogs;
      });
    });

    // Cleanup on unmount
    return () => {
      cleanupSystemInfo();
      cleanupDatabaseInfo();
      cleanupLogs();
    };
  }, [onDevSystemInfoUpdate, onDevDatabaseInfoUpdate, onDevLogUpdate]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      navigate('/dev/login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Logout Error',
        description: error.message || 'Failed to logout. Please try again.',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Developer Dashboard</h1>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge className="bg-green-500 flex items-center gap-1">
                    <FiWifi className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge className="bg-red-500 flex items-center gap-1">
                    <FiWifiOff className="h-3 w-3" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-gray-400 mt-1">System monitoring and debugging tools</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={fetchData}
              disabled={isLoading}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <FiRefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="outline"
              className="border-red-700 text-red-300 hover:bg-red-900 hover:text-red-100"
            >
              <FiLogOut className={cn("mr-2 h-4 w-4", isLoggingOut && "animate-pulse")} />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>

        {/* System Info */}
        {systemInfo && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiServer className="text-purple-500 h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Node Version</p>
                <p className="text-lg font-semibold text-white">{systemInfo.nodeVersion}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Platform</p>
                <p className="text-lg font-semibold text-white">{systemInfo.platform}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Architecture</p>
                <p className="text-lg font-semibold text-white">{systemInfo.arch}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Environment</p>
                <Badge className={systemInfo.env === 'production' ? 'bg-red-500' : 'bg-green-500'}>
                  {systemInfo.env}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400">Uptime</p>
                <p className="text-lg font-semibold text-white">{formatUptime(systemInfo.uptime)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Process ID</p>
                <p className="text-lg font-semibold text-white">{systemInfo.pid}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Memory (RSS)</p>
                <p className="text-lg font-semibold text-white">{formatBytes(systemInfo.memory.rss)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Heap Total</p>
                <p className="text-lg font-semibold text-white">{formatBytes(systemInfo.memory.heapTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Heap Used</p>
                <p className="text-lg font-semibold text-white">{formatBytes(systemInfo.memory.heapUsed)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">External</p>
                <p className="text-lg font-semibold text-white">{formatBytes(systemInfo.memory.external)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Array Buffers</p>
                <p className="text-lg font-semibold text-white">{formatBytes(systemInfo.memory.arrayBuffers)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Working Directory</p>
                <p className="text-sm font-semibold text-white truncate" title={systemInfo.cwd}>
                  {systemInfo.cwd}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Database Info */}
        {databaseInfo && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiDatabase className="text-blue-500 h-5 w-5" />
                Database Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <Badge className={databaseInfo.connected ? 'bg-green-500' : 'bg-red-500'}>
                    {databaseInfo.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Provider</p>
                  <p className="text-lg font-semibold text-white">{databaseInfo.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Pool Size</p>
                  <p className="text-lg font-semibold text-white">{databaseInfo.poolSize}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Active Connections</p>
                  <p className="text-lg font-semibold text-white">{databaseInfo.activeConnections}</p>
                </div>
                {databaseInfo.message && (
                  <div className="col-span-full">
                    <p className="text-sm text-gray-400">Message</p>
                    <p className="text-sm text-white">{databaseInfo.message}</p>
                  </div>
                )}
                {databaseInfo.error && (
                  <div className="col-span-full">
                    <p className="text-sm text-red-400">Error</p>
                    <p className="text-sm text-red-300">{databaseInfo.error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FiFileText className="text-yellow-500 h-5 w-5" />
              System Logs
              {realtimeLogs.length > 0 && (
                <Badge className="ml-2 bg-yellow-500">
                  {realtimeLogs.length} real-time
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {realtimeLogs.length === 0 && (!logs || logs.logs.length === 0) ? (
              <p className="text-gray-400">No logs available</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {/* Show real-time logs first */}
                {realtimeLogs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "p-2 bg-gray-700 rounded text-sm font-mono",
                      log.level === 'error' && "border-l-4 border-red-500",
                      log.level === 'warn' && "border-l-4 border-yellow-500",
                      log.level === 'info' && "border-l-4 border-blue-500",
                      log.level === 'debug' && "border-l-4 border-gray-500"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={cn(
                          log.level === 'error' && "bg-red-500",
                          log.level === 'warn' && "bg-yellow-500",
                          log.level === 'info' && "bg-blue-500",
                          log.level === 'debug' && "bg-gray-500"
                        )}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-white">{log.message}</div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="text-xs text-gray-300 mt-1">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {/* Show initial logs if available */}
                {logs && logs.logs.length > 0 && (
                  <>
                    {logs.logs.map((log, index) => (
                      <div key={`initial-${index}`} className="p-2 bg-gray-700 rounded text-sm font-mono">
                        {JSON.stringify(log, null, 2)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

