import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Server,
  Database,
  HardDrive,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cpu,
  MemoryStick,
  Clock,
  Shield
} from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { monitoringService } from "@/services/monitoringService";
import { systemManagementService } from "@/services/systemManagementService";

const SystemManagementPage = () => {
  const [metrics, setMetrics] = useState({
    health: null,
    system: null,
    database: null,
    storage: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [exportingDatabase, setExportingDatabase] = useState(false);
  const [exportingUploads, setExportingUploads] = useState(false);
  const { toast } = useToast();

  const fetchMetrics = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const [
        healthData,
        systemData,
        databaseData,
        storageData
      ] = await Promise.all([
        monitoringService.getHealthStatus(),
        monitoringService.getSystemMetrics(),
        monitoringService.getDatabaseMetrics(),
        monitoringService.getStorageMetrics()
      ]);

      setMetrics({
        health: healthData.data,
        system: systemData.data,
        database: databaseData.data,
        storage: storageData.data
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch monitoring data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchMetrics(true);
  };

  const handleExportDatabase = async () => {
    try {
      setExportingDatabase(true);
      const blob = await systemManagementService.exportDatabase();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `database_export_${timestamp}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Database export completed successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting database:', error);
      toast({
        title: "Error",
        description: "Failed to export database",
        variant: "destructive",
      });
    } finally {
      setExportingDatabase(false);
    }
  };

  const handleExportUploads = async () => {
    try {
      setExportingUploads(true);
      const blob = await systemManagementService.exportUploads();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `uploads_export_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Uploads export completed successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting uploads:', error);
      toast({
        title: "Error",
        description: "Failed to export uploads folder",
        variant: "destructive",
      });
    } finally {
      setExportingUploads(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Loading system management data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Management</h1>
          <p className="text-muted-foreground">
            Monitor server health and manage system exports
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      {metrics.health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Badge 
                variant="outline" 
                className={`${getStatusColor(metrics.health.status)} text-white`}
              >
                {metrics.health.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Overall system status
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics.health.checks).map(([key, check]) => (
                <div key={key} className="flex items-center gap-2 p-3 border rounded-lg">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium capitalize">{key}</div>
                    <div className="text-sm text-muted-foreground">{check.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.system && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.system.cpu?.usage?.percent || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.system.cpu?.cores || 0} cores
                </p>
                <Progress 
                  value={parseFloat(metrics.system.cpu?.usage?.percent || 0)} 
                  className="mt-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.system.memory?.used?.percent || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.system.memory?.used?.formatted || 'N/A'} / {metrics.system.memory?.total?.formatted || 'N/A'}
                </p>
                <Progress 
                  value={parseFloat(metrics.system.memory?.used?.percent || 0)} 
                  className="mt-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.system.uptime?.formatted || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  Server uptime
                </p>
              </CardContent>
            </Card>

            {metrics.database && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.database.connections?.active || 0} / {metrics.database.connections?.max || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.database.connections?.usage || 0}% usage
                  </p>
                  <Progress 
                    value={parseFloat(metrics.database.connections?.usage || 0)} 
                    className="mt-2" 
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Export Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Export
            </CardTitle>
            <CardDescription>
              Export the entire database as an SQL dump file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.database?.size && (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Database Size:</span>
                  <span className="font-medium">{metrics.database.size?.formatted || 'N/A'}</span>
                </div>
                <Button
                  onClick={handleExportDatabase}
                  disabled={exportingDatabase}
                  className="w-full"
                >
                  {exportingDatabase ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Database
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Uploads Export
            </CardTitle>
            <CardDescription>
              Export the /uploads folder as a compressed ZIP file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.storage?.directories?.uploads && (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uploads Size:</span>
                  <span className="font-medium">{metrics.storage.directories.uploads.totalSize?.formatted || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">File Count:</span>
                  <span className="font-medium">{metrics.storage.directories.uploads.fileCount || 0} files</span>
                </div>
                <Button
                  onClick={handleExportUploads}
                  disabled={exportingUploads}
                  className="w-full"
                  variant="outline"
                >
                  {exportingUploads ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Uploads
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemManagementPage;

