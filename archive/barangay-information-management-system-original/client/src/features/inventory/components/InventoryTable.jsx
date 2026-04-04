import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, Calendar } from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const InventoryTable = ({
  inventories,
  loading,
  error,
  onView,
  page = 1,
  totalPages = 1,
  perPage = 10,
  total = 0,
  handlePrev,
  handleNext,
  setPerPage,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner 
          message="Loading inventory..." 
          variant="default"
          size="default"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (inventories.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">No inventory items found</div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "Invalid Date";
    }
  };



  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Quantity & Unit</TableHead>
            <TableHead>Sponsors</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventories.map((inventory) => (
              <TableRow 
                key={inventory.inventory_id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onView(inventory)}
              >
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{inventory.item_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {inventory.description || "No description"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {inventory.item_type || "N/A"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {inventory.quantity} {inventory.unit}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {inventory.sponsors || "N/A"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {formatDate(inventory.updated_at || inventory.created_at)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mt-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total items)
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={page === 1}
              className="text-xs sm:text-sm"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={page === totalPages || totalPages === 0}
              className="text-xs sm:text-sm"
            >
              Next
            </Button>
            <select
              className="w-full sm:w-24 border rounded px-2 py-1 text-xs sm:text-sm"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryTable;
