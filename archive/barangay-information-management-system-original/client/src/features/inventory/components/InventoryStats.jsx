import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  BarChart3,
  AlertTriangle,
  Clock
} from "lucide-react";
import { format } from "date-fns";

const InventoryStats = ({ inventories = [] }) => {
  const totalItems = inventories.length;
  
  const totalQuantity = inventories.reduce((sum, item) => {
    return sum + (parseInt(item.quantity) || 0);
  }, 0);

  // Low stock items (quantity <= 10)
  const lowStockItems = inventories
    .filter(item => (parseInt(item.quantity) || 0) <= 10)
    .sort((a, b) => (parseInt(a.quantity) || 0) - (parseInt(b.quantity) || 0))
    .slice(0, 3);

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentItems = inventories
    .filter(item => {
      const itemDate = new Date(item.updated_at || item.created_at);
      return itemDate >= sevenDaysAgo;
    })
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="sm:pt-0">
          <div className="text-2xl font-bold">{totalItems}</div>
          <p className="text-xs text-muted-foreground">
            Unique inventory items
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="sm:pt-0">
          <div className="text-2xl font-bold">{totalQuantity}</div>
          <p className="text-xs text-muted-foreground">
            Combined stock count
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryStats;
