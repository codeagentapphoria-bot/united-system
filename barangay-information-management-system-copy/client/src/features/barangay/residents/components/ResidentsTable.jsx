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
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      ) : error ? (
        <div className="py-16 text-center text-destructive text-sm">{error}</div>
      ) : residents.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-sm">No residents found.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barangay</TableHead>
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
                  <TableCell>{resident.barangay_name || ""}</TableCell>
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
                    <div className="flex flex-col gap-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        {resident.contact_number || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        {resident.email || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{resident.occupation || "-"}</TableCell>

                  <TableCell className="font-medium">{resident.resident_id || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
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
    </>
  );
};

export default ResidentsTable;
