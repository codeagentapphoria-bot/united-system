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
    <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mb-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Officials</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="sm:pt-0">
          <div className="text-2xl font-bold">{totalOfficials}</div>
          <p className="text-xs text-muted-foreground">Registered officials</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Positions</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="sm:pt-0">
          <div className="text-2xl font-bold">{uniquePositions.length}</div>
          <p className="text-xs text-muted-foreground">Different positions</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfficialsStats;
