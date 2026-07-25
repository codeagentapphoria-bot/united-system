import { CompactPagination } from "@/components/ui/compact-pagination";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PetTable = ({
  pets = [],
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

export default PetTable;
