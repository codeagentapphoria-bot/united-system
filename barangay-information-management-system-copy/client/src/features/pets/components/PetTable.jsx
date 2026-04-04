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
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {renderSortableHeader(
                "barangay_name",
                "Barangay"
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
                <TableCell colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                  Loading…
                </TableCell>
              </TableRow>
            ) : pets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-gray-500 text-sm">
                  No pets found.
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
                    {pet.barangay_name || "No Barangay"}
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

export default PetTable;
