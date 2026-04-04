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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        <div className="p-1 bg-primary/10 rounded-md">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xl font-bold text-gray-800">{stat.value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
        {stat.trend && (
          <div className="flex items-center gap-1 text-xs text-green-600 mt-1.5">
            <TrendingUp className="h-3 w-3" />
            <span>{stat.trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
