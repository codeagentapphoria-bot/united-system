import React from "react";
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
import { FileText, Calendar, User } from "lucide-react";

const ArchivesTable = ({
  archives = [],
  loading = false,
  onView,
  page = 1,
  totalPages = 1,
  perPage = 10,
  total = 0,
  handlePrev,
  handleNext,
  setPerPage,
}) => {
  const getDocumentTypeBadgeVariant = (documentType) => {
    switch ((documentType || "").toLowerCase()) {
      case "ordinances": return "default";
      case "resolutions": return "secondary";
      case "minutes": return "outline";
      case "certificates": return "default";
      case "letters": return "outline";
      case "forms": return "default";
      case "policies": return "secondary";
      case "lupons": return "outline";
      case "deaths": return "destructive";
      case "others": return "destructive";
      default: return "secondary";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Signatory</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center text-gray-400 text-sm">
                Loading…
              </TableCell>
            </TableRow>
          ) : archives.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center text-gray-400 text-sm">
                No archives found.
              </TableCell>
            </TableRow>
          ) : archives.map((archive) => (
            <TableRow
              key={archive.archive_id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onView(archive)}
            >
              <TableCell>
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="font-medium">{archive.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {archive.description || "No description"}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getDocumentTypeBadgeVariant(archive.document_type)}>
                  {archive.document_type || "N/A"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>{archive.author || "N/A"}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {archive.signatory || "N/A"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatDate(archive.created_at)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t">
        <div className="text-sm text-gray-500">
          Page {page} of {totalPages || 1}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext} disabled={page === totalPages || totalPages === 0}>
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

export default ArchivesTable;
