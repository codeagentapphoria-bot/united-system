import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Eye, Edit } from "lucide-react";
import React from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const ResidentsTable = ({
  residents,
  loading,
  error,
  page,
  totalPages,
  perPage,
  total,
  handlePrev,
  handleNext,
  setPerPage,
  role,
  handleView,
  handleEdit,
}) => {
  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return "default";
      case "deceased":
        return "destructive";
      case "moved out":
      case "moved_out":
        return "secondary";
      case "temporarily away":
      case "temporarily_away":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <>
      {loading ? (
        <LoadingSpinner 
          message="Loading residents..." 
          variant="default"
          size="sm"
        />
      ) : error ? (
        <div className="text-center text-destructive py-8">{error}</div>
      ) : residents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No residents found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {role === "barangay" ? "Purok" : "Barangay"}
              </TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Civil Status</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {residents.map((resident) => {
              const age = resident.birthdate
                ? new Date().getFullYear() -
                  new Date(resident.birthdate).getFullYear()
                : "-";
              return (
                <TableRow
                  key={resident.id}
                  onClick={() => handleView(resident)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    {role === "barangay"
                      ? resident.purok_name || resident.purok || ""
                      : resident.barangay_name || ""}
                  </TableCell>
                  <TableCell>
                    {`${resident.first_name || ""} ${
                      resident.middle_name ? resident.middle_name : ""
                    } ${resident.last_name || ""}${
                      resident.suffix ? ` ${resident.suffix}` : ""
                    }`}
                  </TableCell>
                  <TableCell className="capitalize">
                    {resident.sex || "N/A"}
                  </TableCell>
                  <TableCell className="capitalize">
                    {resident.civil_status}
                  </TableCell>
                  <TableCell>{age}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {resident.contact_number || "None"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {resident.email || "None"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{resident.occupation || "-"}</TableCell>

                  <TableCell className="font-medium">{resident.id}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mt-4">
        <div className="text-xs sm:text-sm">
          Page {page} of {totalPages}
        </div>
        <div className="flex flex-row sm:flex-row gap-2 items-center w-full sm:w-auto">
          <div className="flex gap-2">
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
          </div>
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
    </>
  );
};

export default ResidentsTable;
