import { Card, CardContent } from "@/components/ui/card";
import { CompactPagination } from "@/components/ui/compact-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const HouseholdTable = ({
  households = [],
  loading = false,
  onView,
  sortBy,
  sortOrder,
  onSort,
  page,
  totalPages,
  perPage,
  total,
  setPage,
}) => {
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

        <CompactPagination
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={perPage}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  );
};

export default HouseholdTable;
