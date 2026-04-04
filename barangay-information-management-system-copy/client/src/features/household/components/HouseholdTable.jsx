import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";

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
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {renderSortableHeader("barangay_name", "Barangay")}
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
                <TableCell colSpan={5} className="py-16 text-center text-gray-400 text-sm">Loading…</TableCell>
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
                    <div className="font-medium">{household.barangay_name || ""}</div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {household.house_head}
                  </TableCell>
                  <TableCell>
                    {[household.house_number, household.street, household.barangay_name].filter(Boolean).join(', ') || '-'}
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

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t">
          <div className="text-sm text-gray-500">
            Page {page} of {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={page === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
          <select
            className="w-24 border rounded px-2 py-1 text-sm"
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
};

export default HouseholdTable;
