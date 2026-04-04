import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Award } from "lucide-react";

const OfficialsStats = ({ officials = [] }) => {
  // Calculate stats from officials data
  const totalOfficials = officials.length;

  // Get unique positions
  const uniquePositions = [
    ...new Set(officials.map((o) => o.position).filter(Boolean)),
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">Total Officials</CardTitle>
          <Crown className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold text-gray-800">{totalOfficials}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Registered officials</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">Positions</CardTitle>
          <Award className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold text-gray-800">{uniquePositions.length}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Different positions</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfficialsStats;
