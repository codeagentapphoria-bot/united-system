import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToCSV, exportToJSON } from "@/utils/dashboardUtils";

const ChartCard = ({
  title,
  description,
  icon: Icon,
  children,
  data,
  rawData,
  filename,
  showExport = true,
}) => {
  const handleCSVExport = () => {
    if (data && data.length > 0) {
      exportToCSV(data, filename);
    }
  };

  const handleJSONExport = () => {
    if (rawData) {
      exportToJSON(rawData, filename);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
              {title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
          </div>
          {showExport && (
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCSVExport}
                disabled={!data || data.length === 0}
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleJSONExport}
                disabled={!rawData}
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">JSON</span>
                <span className="sm:hidden">JSON</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default ChartCard;
