import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const StatCard = ({ stat }) => {
  const Icon = stat.icon;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !pb-1">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        <div className="p-1.5 sm:p-1 bg-primary/10 rounded-lg">
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className=" sm:pt-0">
        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
        <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
        {stat.trend && (
          <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
            <TrendingUp className="h-3 w-3" />
            <span className="hidden sm:inline">{stat.trend}</span>
            <span className="sm:hidden">{stat.trend.length > 20 ? stat.trend.substring(0, 20) + '...' : stat.trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
