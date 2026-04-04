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
import { Eye, Edit, Trash, PawPrint } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const PetTable = ({
  pets = [],
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

  const calculateAge = (birthdate) => {
    if (!birthdate) return "-";
    const today = new Date();
    const birth = new Date(birthdate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      return age - 1;
    }
    return age;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pets List</CardTitle>
        <CardDescription>Total pets: {pets.length}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {renderSortableHeader(
                "purok_name",
                user?.target_type === "barangay" ? "Purok" : "Barangay"
              )}
              {renderSortableHeader("pet_name", "Pet Name")}
              {renderSortableHeader("species", "Species")}
              {renderSortableHeader("breed", "Breed")}
              {renderSortableHeader("sex", "Sex")}
              {renderSortableHeader("birthdate", "Age")}
              {renderSortableHeader("color", "Color")}
              {renderSortableHeader("owner_name", "Owner")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <LoadingSpinner 
                    message="Loading pets..." 
                    variant="default"
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ) : pets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <span className="text-muted-foreground">No pets found</span>
                </TableCell>
              </TableRow>
            ) : (
              pets.map((pet) => (
                <TableRow
                  key={pet.pet_id}
                  onClick={() => onView(pet.pet_id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="capitalize">
                    {user?.target_type === "barangay"
                      ? pet.purok_name || "No Purok"
                      : pet.barangay_name || "No Barangay"}
                  </TableCell>
                  <TableCell className="font-medium">{pet.pet_name}</TableCell>
                  <TableCell className="capitalize">{pet.species}</TableCell>
                  <TableCell className="capitalize">{pet.breed}</TableCell>
                  <TableCell className="capitalize">{pet.sex}</TableCell>
                  <TableCell>{calculateAge(pet.birthdate)} years</TableCell>
                  <TableCell className="capitalize">{pet.color}</TableCell>
                  <TableCell>
                    {pet.owner_name || `ID: ${pet.owner_id}`}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mt-4 px-6 pb-6">
        <div className="text-xs sm:text-sm">
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

export default PetTable;
