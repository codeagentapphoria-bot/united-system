import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, Clock, Users, FileText, MessageSquare, Package, Building, Home, PawPrint, RefreshCw, User, MapPin, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AuditService from "@/services/auditService";

const RecentActivities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.target_id) {
      loadRecentActivities();
    }
  }, [user?.target_id, user?.target_type]);

  const loadRecentActivities = useCallback(async () => {
    try {
      setLoading(true);
      const auditLogs = await AuditService.getRecentActivities(
        user?.target_type,
        user?.target_id,
        10
      );
      const transformedActivities = AuditService.transformAuditLogs(auditLogs);
      setActivities(transformedActivities);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error loading recent activities:", error);
}
      toast({
        title: "Error",
        description: "Failed to load recent activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.target_type, user?.target_id, toast]);

  const getIconComponent = useCallback((iconName) => {
    const iconMap = {
      Users,
      FileText,
      MessageSquare,
      Package,
      Activity,
      Building,
      PawPrint,
      User,
      MapPin,
      Building2,
      Home
    };
    return iconMap[iconName] || Activity;
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-4 w-4" />
            Recent Activities
          </CardTitle>
          <CardDescription className="text-xs">Latest system activities</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 animate-pulse">
                <div className="w-6 h-6 bg-muted rounded-md"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
          Recent Activities
        </CardTitle>
        <CardDescription className="text-xs">Latest system activities</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {activities.length > 0 ? (
            activities.slice(0, 6).map((activity) => {
              const Icon = getIconComponent(activity.icon);
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  title={`${activity.action} by ${activity.user}`}
                >
                  <div
                    className={`p-1.5 rounded-md flex-shrink-0 ${
                      activity.type === "success"
                        ? "bg-green-100 text-green-600"
                        : activity.type === "warning"
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium leading-tight">{activity.action}</p>
                      {activity.details && (
                        <p className="text-xs text-muted-foreground leading-tight">
                          {activity.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No recent activities</p>
            </div>
          )}
        </div>
        {activities.length > 0 && (
          <div className="mt-3 pt-2 border-t">
            <button
              onClick={loadRecentActivities}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivities;
