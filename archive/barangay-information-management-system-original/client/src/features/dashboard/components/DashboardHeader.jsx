import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const DashboardHeader = ({ role, user, onRefresh }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Comprehensive insights for {role} management
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
        <Badge variant="outline" className="text-xs sm:text-sm">
          {user.role === "admin" ? "Administrator" : "Staff Member"}
        </Badge>
        <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs sm:text-sm">
          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Refresh</span>
          <span className="sm:hidden">↻</span>
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
