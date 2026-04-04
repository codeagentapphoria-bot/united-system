import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Edit, Trash } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const HouseholdTable = ({
  households = [],
  loading = false,
  onView,
  onEdit,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
  page,
  totalPages,
  perPage,
  total,
  handlePrev,
  handleNext,
  setPerPage,
}) => {
  const { user } = useAuth();

  const renderSortableHeader = (field, label) => {
    const isActive = sortBy === field;
    return (
      <TableHead
        className="cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive && (
            <span className="text-primary">
              {sortOrder === "asc" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Households List</CardTitle>
        <CardDescription>Total households: {households.length}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {user.target_type === "barangay" &&
                renderSortableHeader("purok_name", "Purok")}
              {user.target_type === "municipality" &&
                renderSortableHeader("barangay_name", "Barangay Name")}
              {renderSortableHeader("house_head", "House Head")}
              {renderSortableHeader("house_number", "Address")}
              {renderSortableHeader(
                "total_monthly_income",
                "Household Monthly Income"
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <LoadingSpinner 
                    message="Loading households..." 
                    variant="default"
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ) : households.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <span className="text-muted-foreground">
                    No households found
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              households.map((household) => (
                <TableRow
                  key={household.household_id}
                  onClick={() => onView(household.household_id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.target_type === "barangay"
                          ? household.purok_name
                          : household.barangay_name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {household.house_head}
                  </TableCell>
                  <TableCell>
                    {household.house_number}
                    {household.house_number && household.street ? ", " : " "}
                    {household.street}
                    {user.target_type === "municipality" && (
                      <>
                        {household.house_number || household.street ? ", " : ""}
                        {household.purok_name}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    ₱
                    {parseFloat(
                      household.total_monthly_income || 0
                    ).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mt-4 px-6 pb-6">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex flex-row sm:flex-row gap-2 items-center w-full sm:w-auto">
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
    </Card>
  );
};

export default HouseholdTable;
