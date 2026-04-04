import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const DashboardHeader = ({ role, user, onRefresh }) => {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Analytics Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Comprehensive insights for {role} management
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 shrink-0">
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
    </div>
  );
};

export default DashboardHeader;
