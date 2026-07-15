import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompactPagination } from "@/components/ui/compact-pagination";
import { Phone, Mail } from "lucide-react";
import React from "react";

const ResidentsTable = ({
  residents,
  loading,
  error,
  page,
  totalPages,
  perPage,
  total,
  setPage,
  handleView,
}) => {
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

export default ResidentsTable;
