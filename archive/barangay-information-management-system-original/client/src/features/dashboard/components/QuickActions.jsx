import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Building,
  FileText,
  MessageSquare,
  Download,
  Settings,
  MapPin,
  BarChart3,
  Plus,
  Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/utils/api";

const QuickActions = ({ role }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleExportData = useCallback(async () => {
    try {
      toast({
        title: "Exporting data...",
        description: "Please wait while we prepare your export.",
      });

      const response = await api.get(`/export/${user?.target_id}/barangay-data`, {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bims-export-${new Date().toISOString().split("T")[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Export error:", error);
}
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  }, [user?.target_id, toast]);

  const barangayActions = [
    {
      icon: Plus,
      title: "Add Resident",
      description: "Register a new resident",
      action: () => navigate("/admin/barangay/residents"),
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      icon: Building,
      title: "Add Household",
      description: "Create a new household",
      action: () => navigate("/admin/barangay/households"),
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },

    {
      icon: MessageSquare,
      title: "View Requests",
      description: "Check pending requests",
      action: () => navigate("/admin/barangay/requests"),
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      icon: Eye,
      title: "View Archives",
      description: "Access archived documents",
      action: () => navigate("/admin/barangay/archives"),
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      icon: Settings,
      title: "Settings",
      description: "Manage barangay settings",
      action: () => navigate("/admin/shared/settings"),
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  ];

  const municipalityActions = [
    {
      icon: MapPin,
      title: "Manage Barangays",
      description: "View and manage barangays",
      action: () => navigate("/admin/municipality/barangays"),
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      icon: Users,
      title: "Manage Users",
      description: "Manage system users",
      action: () => navigate("/admin/shared/accounts"),
      color: "text-green-600",
      bgColor: "bg-green-100",
    },

    {
      icon: Download,
      title: "Export Data",
      description: "Export system data",
      action: handleExportData,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      icon: Eye,
      title: "View Activities",
      description: "Monitor system activities",
      action: () => navigate("/admin/shared/activities"),
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      icon: Settings,
      title: "Settings",
      description: "Manage system settings",
      action: () => navigate("/admin/shared/settings"),
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  ];

  const actions = useMemo(() => 
    role === "barangay" ? barangayActions : municipalityActions, 
    [role]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <div className="h-3 w-3 sm:h-4 sm:w-4" />
          Quick Actions
        </CardTitle>
        <CardDescription className="text-xs">Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card
                key={index}
                className="p-3 hover:bg-accent/50 cursor-pointer transition-all duration-200 border-dashed hover:border-solid hover:shadow-md group"
                onClick={action.action}
              >
                <div className="flex flex-col items-center text-center space-y-1 sm:space-y-1.5">
                  <div className={`p-1 sm:p-1.5 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${action.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{action.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{action.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
