import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompactPagination } from "@/components/ui/compact-pagination";
import { Package, Calendar } from "lucide-react";
import { format } from "date-fns";

const InventoryTable = ({
  inventories,
  loading,
  error,
  onView,
  page = 1,
  totalPages = 1,
  perPage = 10,
  total = 0,
  setPage,
}) => {
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
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center text-gray-400 text-sm">
                Loading…
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center text-red-500 text-sm">
                {error}
              </TableCell>
            </TableRow>
          ) : inventories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center text-gray-400 text-sm">
                No inventory items found.
              </TableCell>
            </TableRow>
          ) : inventories.map((inventory) => (
            <TableRow
              key={inventory.inventory_id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onView(inventory)}
            >
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Package className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="font-medium">{inventory.item_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {inventory.description || "No description"}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{inventory.item_type || "N/A"}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {inventory.quantity} {inventory.unit}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{inventory.sponsors || "N/A"}</div>
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

      <CompactPagination
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
      />
    </>
  );
};

export default InventoryTable;
