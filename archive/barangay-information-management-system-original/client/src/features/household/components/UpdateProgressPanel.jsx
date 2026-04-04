import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useHouseholdUpdates } from "../hooks/useHouseholdUpdates";

const UpdateProgressPanel = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [localHistory, setLocalHistory] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  const {
    isUpdating,
    updateProgress,
    lastUpdate,
    getUpdateStats,
    getLocalHistory,
    getAuditLog,
    exportAuditLog,
    clearLocalHistory,
    subscribeToUpdates,
  } = useHouseholdUpdates();

  // Subscribe to updates
  useEffect(() => {
    const unsubscribe = subscribeToUpdates((newStats) => {
      setStats(newStats);
    });

    return unsubscribe;
  }, [subscribeToUpdates]);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      setStats(getUpdateStats());
      setLocalHistory(getLocalHistory(20));
      setAuditLog(getAuditLog(20));
    }
  }, [isOpen, getUpdateStats, getLocalHistory, getAuditLog]);

  // Refresh data
  const handleRefresh = () => {
    setStats(getUpdateStats());
    setLocalHistory(getLocalHistory(20));
    setAuditLog(getAuditLog(20));
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case "create":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "update":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case "delete":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get action color
  const getActionColor = (action) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Update Progress & History</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isUpdating}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportAuditLog}>
                <Download className="h-4 w-4" />
                Export Log
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Progress */}
          {isUpdating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Current Update Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={updateProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Progress: {updateProgress}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Update Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.total}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Operations
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.create}
                    </div>
                    <div className="text-sm text-muted-foreground">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.update}
                    </div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.delete}
                    </div>
                    <div className="text-sm text-muted-foreground">Deleted</div>
                  </div>
                </div>
                {stats.errors > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700">
                        {stats.errors} operation(s) failed
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Updates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Local History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Recent Updates
                  <Button variant="ghost" size="sm" onClick={clearLocalHistory}>
                    Clear
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {localHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No recent updates
                      </p>
                    ) : (
                      localHistory.map((update) => (
                        <div
                          key={update.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          {getActionIcon(update.action)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={getActionColor(update.action)}>
                                {update.action}
                              </Badge>
                              {update.householdId && (
                                <span className="text-sm text-muted-foreground">
                                  ID: {update.householdId}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimestamp(update.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Audit Log */}
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {auditLog.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No audit entries
                      </p>
                    ) : (
                      auditLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          {getActionIcon(entry.action)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={getActionColor(entry.action)}>
                                {entry.action}
                              </Badge>
                              {entry.data?.householdId && (
                                <span className="text-sm text-muted-foreground">
                                  ID: {entry.data.householdId}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimestamp(entry.timestamp)}
                            </p>
                            {entry.result?.error && (
                              <p className="text-xs text-red-600 mt-1">
                                Error: {entry.result.error}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Last Update Info */}
          {lastUpdate && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Last update: {formatTimestamp(lastUpdate)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateProgressPanel;
