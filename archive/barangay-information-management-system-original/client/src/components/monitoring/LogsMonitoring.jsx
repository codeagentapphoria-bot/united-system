import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Search,
  Filter,
  Clock,
  HardDrive,
  Activity,
  Zap,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { monitoringService } from "@/services/monitoringService";

const LogsMonitoring = ({ token }) => {
  const [logsData, setLogsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lines, setLines] = useState(100);
  const [logType, setLogType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const scrollAreaRef = useRef(null);
  const { toast } = useToast();

  const fetchLogs = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setLoading(true);
      
      const response = await monitoringService.getLogsMetrics(token, lines, logType);
      setLogsData(response.data);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch logs data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [lines, logType]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(true);
      }, 5000); // Refresh every 5 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, lines, logType]);

  useEffect(() => {
    if (logsData && searchTerm) {
      const filtered = filterLogs(logsData, searchTerm);
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs(logsData);
    }
  }, [logsData, searchTerm]);

  const filterLogs = (data, searchTerm) => {
    if (!data) return null;
    
    const filtered = { ...data };
    
    // Filter PM2 logs
    if (filtered.pm2) {
      filtered.pm2 = {
        ...filtered.pm2,
        output: filtered.pm2.output.filter(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        errors: filtered.pm2.errors.filter(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        )
      };
    }
    
    // Filter application logs
    if (filtered.application) {
      filtered.application = filtered.application.map(log => ({
        ...log,
        lines: log.lines.filter(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }));
    }
    
    // Filter error logs
    if (filtered.errors) {
      filtered.errors = filtered.errors.map(log => ({
        ...log,
        lines: log.lines.filter(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }));
    }
    
    return filtered;
  };

  const handleRefresh = () => {
    fetchLogs(true);
  };

  const handleDownload = () => {
    if (!logsData) return;
    
    const logContent = generateLogContent(logsData);
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bims-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateLogContent = (data) => {
    let content = `BIMS System Logs - ${new Date().toISOString()}\n`;
    content += '='.repeat(50) + '\n\n';
    
    if (data.pm2) {
      content += 'PM2 LOGS\n';
      content += '-'.repeat(20) + '\n';
      content += 'OUTPUT:\n';
      data.pm2.output.forEach(line => content += line + '\n');
      content += '\nERRORS:\n';
      data.pm2.errors.forEach(line => content += line + '\n');
      content += '\n';
    }
    
    if (data.application) {
      content += 'APPLICATION LOGS\n';
      content += '-'.repeat(20) + '\n';
      data.application.forEach(log => {
        content += `\n${log.file}:\n`;
        log.lines.forEach(line => content += line + '\n');
      });
      content += '\n';
    }
    
    if (data.errors) {
      content += 'ERROR LOGS\n';
      content += '-'.repeat(20) + '\n';
      data.errors.forEach(log => {
        content += `\n${log.file}:\n`;
        log.lines.forEach(line => content += line + '\n');
      });
    }
    
    return content;
  };

  const getLogLevel = (line) => {
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
      return 'error';
    } else if (line.toLowerCase().includes('warn')) {
      return 'warning';
    } else if (line.toLowerCase().includes('info')) {
      return 'info';
    }
    return 'default';
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-300';
    }
  };

  const formatLogLine = (line) => {
    if (!showTimestamp) {
      // Remove timestamp if it exists (format: YYYY-MM-DD HH:mm:ss)
      return line.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[:\d]*\s*/, '');
    }
    return line;
  };

  if (loading && !logsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            Logs Monitoring Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lines" className="text-white">Lines to Show</Label>
              <Select value={lines.toString()} onValueChange={(value) => setLines(parseInt(value))}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 lines</SelectItem>
                  <SelectItem value="100">100 lines</SelectItem>
                  <SelectItem value="200">200 lines</SelectItem>
                  <SelectItem value="500">500 lines</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logType" className="text-white">Log Type</Label>
              <Select value={logType} onValueChange={setLogType}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Logs</SelectItem>
                  <SelectItem value="pm2">PM2 Logs</SelectItem>
                  <SelectItem value="application">Application Logs</SelectItem>
                  <SelectItem value="errors">Error Logs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search" className="text-white">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Actions</Label>
              <div className="flex gap-2">
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
                  onClick={handleDownload}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-500 hover:bg-green-600" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
            >
              <Activity className="h-4 w-4 mr-2" />
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            
            <Button
              variant={showTimestamp ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTimestamp(!showTimestamp)}
              className={showTimestamp ? "bg-blue-500 hover:bg-blue-600" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
            >
              {showTimestamp ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              Timestamps {showTimestamp ? 'ON' : 'OFF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Statistics */}
      {filteredLogs?.statistics && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Log File Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLogs.statistics.map((stat, index) => (
                <div key={index} className="border border-white/10 rounded-lg p-3 bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-white">{stat.file}</div>
                    <Badge variant={stat.exists ? "default" : "secondary"} className="text-xs">
                      {stat.exists ? 'Active' : 'Missing'}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-300 mt-2">
                    <div>Size: {stat.size.formatted}</div>
                    <div>Lines: {stat.lines.toLocaleString()}</div>
                    {stat.lastModified && (
                      <div>Modified: {new Date(stat.lastModified).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Content */}
      <Tabs defaultValue="pm2" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-white/10 border-white/20">
          <TabsTrigger value="pm2" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
            <Zap className="h-4 w-4" />
            PM2 Logs
          </TabsTrigger>
          <TabsTrigger value="application" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
            <Activity className="h-4 w-4" />
            Application
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
            <AlertTriangle className="h-4 w-4" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="combined" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
            <FileText className="h-4 w-4" />
            Combined
          </TabsTrigger>
        </TabsList>

        {/* PM2 Logs */}
        <TabsContent value="pm2" className="space-y-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">PM2 Process Logs</CardTitle>
              <CardDescription className="text-slate-300">
                Real-time logs from PM2 processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea ref={scrollAreaRef} className="h-96 w-full">
                <div className="space-y-2">
                  {filteredLogs?.pm2?.output?.map((line, index) => (
                    <div key={index} className="text-sm font-mono">
                      <span className={`${getLogLevelColor(getLogLevel(line))}`}>
                        {formatLogLine(line)}
                      </span>
                    </div>
                  ))}
                  {filteredLogs?.pm2?.errors?.map((line, index) => (
                    <div key={`error-${index}`} className="text-sm font-mono text-red-400">
                      {formatLogLine(line)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Application Logs */}
        <TabsContent value="application" className="space-y-4">
          {filteredLogs?.application?.map((log, index) => (
            <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">{log.file}</CardTitle>
                <CardDescription className="text-slate-300">
                  {log.count} lines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full">
                  <div className="space-y-1">
                    {log.lines.map((line, lineIndex) => (
                      <div key={lineIndex} className="text-sm font-mono">
                        <span className={`${getLogLevelColor(getLogLevel(line))}`}>
                          {formatLogLine(line)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Error Logs */}
        <TabsContent value="errors" className="space-y-4">
          {filteredLogs?.errors?.map((log, index) => (
            <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">{log.file}</CardTitle>
                <CardDescription className="text-slate-300">
                  {log.count} error lines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full">
                  <div className="space-y-1">
                    {log.lines.map((line, lineIndex) => (
                      <div key={lineIndex} className="text-sm font-mono text-red-400">
                        {formatLogLine(line)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Combined Logs */}
        <TabsContent value="combined" className="space-y-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">All Logs Combined</CardTitle>
              <CardDescription className="text-slate-300">
                All log entries in chronological order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-1">
                  {[
                    ...(filteredLogs?.pm2?.output || []),
                    ...(filteredLogs?.pm2?.errors || []),
                    ...(filteredLogs?.application?.flatMap(log => log.lines) || []),
                    ...(filteredLogs?.errors?.flatMap(log => log.lines) || [])
                  ].map((line, index) => (
                    <div key={index} className="text-sm font-mono">
                      <span className={`${getLogLevelColor(getLogLevel(line))}`}>
                        {formatLogLine(line)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogsMonitoring;
