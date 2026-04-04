import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  Server,
  HardDrive,
  Wifi,
  Database,
  Cpu,
  MemoryStick,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Monitor,
  Network,
  HardDriveIcon,
  Zap,
  Shield,
  Globe,
  Lock,
  LogIn,
  FileText,
  Trash2,
  FileX
} from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { monitoringService } from "@/services/monitoringService";
import LogsMonitoring from "@/components/monitoring/LogsMonitoring";

const StandaloneMonitoringPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [metrics, setMetrics] = useState({
    system: null,
    storage: null,
    network: null,
    health: null,
    database: null,
    application: null,
    logs: null
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { toast } = useToast();

  // Check if user is already authenticated (from localStorage)
  useEffect(() => {
    const savedToken = localStorage.getItem('monitoring_token');
    if (savedToken) {
      setAuthToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (!authToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter an authentication token",
        variant: "destructive",
      });
      return;
    }

    // Save token to localStorage
    localStorage.setItem('monitoring_token', authToken);
    setIsAuthenticated(true);
    fetchMetrics();
  };

  const handleLogout = () => {
    localStorage.removeItem('monitoring_token');
    setAuthToken("");
    setIsAuthenticated(false);
    setMetrics({
      system: null,
      storage: null,
      network: null,
      health: null,
      database: null,
      application: null,
      logs: null
    });
  };

  const fetchMetrics = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setLoading(true);
      
      // Set the auth token for API calls
      const token = localStorage.getItem('monitoring_token');
      
      const [
        systemData,
        storageData,
        networkData,
        healthData,
        databaseData,
        applicationData,
        logsData
      ] = await Promise.all([
        monitoringService.getSystemMetrics(token),
        monitoringService.getStorageMetrics(token),
        monitoringService.getNetworkMetrics(token),
        monitoringService.getHealthStatus(token),
        monitoringService.getDatabaseMetrics(token),
        monitoringService.getApplicationMetrics(token),
        monitoringService.getLogsMetrics(token)
      ]);

      setMetrics({
        system: systemData.data,
        storage: storageData.data,
        network: networkData.data,
        health: healthData.data,
        database: databaseData.data,
        application: applicationData.data,
        logs: logsData.data
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch monitoring data. Please check your authentication token.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchMetrics();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleRefresh = () => {
    fetchMetrics(true);
  };

  const handleClearCache = async () => {
    try {
      const token = localStorage.getItem('monitoring_token');
      const response = await monitoringService.clearCache(token);
      toast({
        title: "Cache Cleared",
        description: `Successfully cleared ${response.data.clearedKeys} cache keys`,
        variant: "default",
      });
      // Refresh metrics after clearing cache
      setTimeout(() => {
        fetchMetrics(true);
      }, 1000);
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: "Error",
        description: "Failed to clear cache",
        variant: "destructive",
      });
    }
  };

  const handleClearLogs = async () => {
    try {
      const token = localStorage.getItem('monitoring_token');
      const response = await monitoringService.clearLogs(token);
      toast({
        title: "Logs Cleared",
        description: `Successfully cleared ${response.data.clearedFiles} log files (${response.data.clearedSizeFormatted})`,
        variant: "default",
      });
      // Refresh metrics after clearing logs
      setTimeout(() => {
        fetchMetrics(true);
      }, 1000);
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: "Error",
        description: "Failed to clear logs",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Authentication form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Monitor className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">BIMS System Monitoring</CardTitle>
            <CardDescription>
              Enter your authentication token to access system monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Authentication Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Enter your JWT token"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={!authToken.trim()}>
              <LogIn className="h-4 w-4 mr-2" />
              Access Monitoring
            </Button>
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                This is a secure monitoring interface. Only authorized personnel should access this page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">System Monitoring</h1>
            <p className="text-slate-300 mt-2">
              Real-time system metrics and health monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-slate-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLogs}
              className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
            >
              <FileX className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              className="bg-orange-500/20 border-orange-500/30 text-orange-300 hover:bg-orange-500/30"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Overall Health Status */}
        {metrics.health && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5" />
                System Health Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(metrics.health.status)} text-white border-0`}
                >
                  {metrics.health.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-slate-300">
                  Overall system status
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(metrics.health.checks).map(([key, check]) => (
                  <div key={key} className="flex items-center gap-2 p-3 border border-white/10 rounded-lg bg-white/5">
                    {getStatusIcon(check.status)}
                    <div>
                      <div className="font-medium text-white capitalize">{key}</div>
                      <div className="text-sm text-slate-300">{check.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !metrics.system && (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner message="Loading monitoring data..." />
          </div>
        )}

        {/* Monitoring Tabs */}
        {metrics.system && (
          <Tabs defaultValue="system" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7 bg-white/10 border-white/20">
              <TabsTrigger value="system" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                <Monitor className="h-4 w-4" />
                System
              </TabsTrigger>
              <TabsTrigger value="storage" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                <HardDrive className="h-4 w-4" />
                Storage
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                <Network className="h-4 w-4" />
                Network
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                <Database className="h-4 w-4" />
                Database
              </TabsTrigger>
              <TabsTrigger value="application" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                <Zap className="h-4 w-4" />
                Application
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                <Activity className="h-4 w-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                <FileText className="h-4 w-4" />
                Logs
              </TabsTrigger>
            </TabsList>

            {/* System Metrics */}
            <TabsContent value="system" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">CPU Usage</CardTitle>
                    <Cpu className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{metrics.system?.cpu?.usage?.percent || 'N/A'}%</div>
                    <p className="text-xs text-slate-300">
                      {metrics.system?.cpu?.cores || 'N/A'} cores • {metrics.system?.cpu?.model || 'N/A'}
                    </p>
                    <div className="mt-2">
                      <div className="text-xs text-slate-400 mb-1">Load Average</div>
                      <div className="text-xs text-slate-300">
                        1m: {metrics.system?.cpu?.usage?.loadAverage?.['1min'] || 'N/A'} | 
                        5m: {metrics.system?.cpu?.usage?.loadAverage?.['5min'] || 'N/A'} | 
                        15m: {metrics.system?.cpu?.usage?.loadAverage?.['15min'] || 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">Memory Usage</CardTitle>
                    <MemoryStick className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{metrics.system?.memory?.used?.percent || 'N/A'}%</div>
                    <p className="text-xs text-slate-300">
                      {metrics.system?.memory?.used?.formatted || 'N/A'} of {metrics.system?.memory?.total?.formatted || 'N/A'}
                    </p>
                    <Progress 
                      value={parseFloat(metrics.system?.memory?.used?.percent || 0)} 
                      className="mt-2" 
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">System Uptime</CardTitle>
                    <Clock className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{metrics.system?.uptime?.formatted || 'N/A'}</div>
                    <p className="text-xs text-slate-300">
                      {metrics.system?.system?.hostname || 'N/A'} • {metrics.system?.system?.platform || 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Storage Metrics */}
            <TabsContent value="storage" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <HardDriveIcon className="h-5 w-5" />
                      Disk Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics.storage.disk && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-white">Used Space</span>
                          <span className="text-sm text-white">{metrics.storage.disk.used.percent}%</span>
                        </div>
                        <Progress value={parseFloat(metrics.storage.disk.used.percent)} />
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400">Total</div>
                            <div className="font-medium text-white">{metrics.storage.disk.total.formatted}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Used</div>
                            <div className="font-medium text-white">{metrics.storage.disk.used.formatted}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Free</div>
                            <div className="font-medium text-white">{metrics.storage.disk.free.formatted}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Directory Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(metrics.storage.directories).map(([key, dir]) => (
                        dir && (
                          <div key={key} className="border border-white/10 rounded-lg p-3 bg-white/5">
                            <div className="font-medium text-white capitalize">{key}</div>
                            <div className="text-sm text-slate-300">
                              {dir.fileCount} files • {dir.totalSize.formatted}
                            </div>
                          </div>
                        )
                      ))}
                      {metrics.storage.database && (
                        <div className="border border-white/10 rounded-lg p-3 bg-white/5">
                          <div className="font-medium text-white">Database</div>
                          <div className="text-sm text-slate-300">
                            {metrics.storage.database.formatted}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Network Metrics */}
            <TabsContent value="network" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Globe className="h-5 w-5" />
                      Network Interfaces
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.network.interfaces.map((iface, index) => (
                        <div key={index} className="border border-white/10 rounded-lg p-3 bg-white/5">
                          <div className="font-medium text-white">{iface.interface}</div>
                          <div className="text-sm text-slate-300">
                            IP: {iface.address} • MAC: {iface.mac}
                          </div>
                          <div className="text-xs text-slate-400">
                            Netmask: {iface.netmask}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Process Memory</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(metrics.network.process.memory).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-sm font-medium text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Database Metrics */}
            <TabsContent value="database" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Database Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-300">Size</span>
                        <span className="text-sm font-medium text-white">{metrics.database.size.formatted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-300">Active Connections</span>
                        <span className="text-sm font-medium text-white">
                          {metrics.database.connections.active} / {metrics.database.connections.max}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-300">Connection Usage</span>
                        <span className="text-sm font-medium text-white">{metrics.database.connections.usage}%</span>
                      </div>
                      <Progress value={parseFloat(metrics.database.connections.usage)} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Table Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.database.tables.slice(0, 5).map((table, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="truncate text-slate-300">{table.tablename}</span>
                          <span className="text-slate-400">
                            {table.inserts + table.updates + table.deletes} ops
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Application Metrics */}
            <TabsContent value="application" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Application Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-300">Node Version</span>
                        <span className="text-sm font-medium text-white">{metrics.application.application.nodeVersion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-300">Platform</span>
                        <span className="text-sm font-medium text-white">{metrics.application.application.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-300">Process ID</span>
                        <span className="text-sm font-medium text-white">{metrics.application.application.pid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-300">Uptime</span>
                        <span className="text-sm font-medium text-white">{metrics.application.application.uptime.formatted}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Cache Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {metrics.application.cache.connected ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-white">
                          Redis: {metrics.application.cache.connected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      {metrics.application.cache.message && (
                        <div className="text-sm text-slate-300">
                          {metrics.application.cache.message}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Performance Metrics */}
            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">CPU Load</CardTitle>
                    <Cpu className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {metrics.system?.cpu?.usage?.loadAverage?.['1min'] || 'N/A'}
                    </div>
                    <p className="text-xs text-slate-300">1-minute average</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">Memory Pressure</CardTitle>
                    <MemoryStick className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {metrics.system?.memory?.used?.percent || 'N/A'}%
                    </div>
                    <p className="text-xs text-slate-300">Memory utilization</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">Disk Usage</CardTitle>
                    <HardDrive className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {metrics.storage?.disk?.used.percent || 'N/A'}%
                    </div>
                    <p className="text-xs text-slate-300">Storage utilization</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">DB Connections</CardTitle>
                    <Database className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {metrics.database?.connections?.usage || 'N/A'}%
                    </div>
                    <p className="text-xs text-slate-300">Connection pool usage</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Logs Monitoring */}
            <TabsContent value="logs" className="space-y-4">
              <LogsMonitoring token={localStorage.getItem('monitoring_token')} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default StandaloneMonitoringPage;
