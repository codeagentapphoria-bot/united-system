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
import LoadingSpinner from "@/components/common/LoadingSpinner";

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
      case "ordinances":
        return "default";
      case "resolutions":
        return "secondary";
      case "minutes":
        return "outline";
      case "certificates":
        return "default";

      case "letters":
        return "outline";
      case "forms":
        return "default";
      case "policies":
        return "secondary";
      case "lupons":
        return "outline";
      case "deaths":
        return "destructive";
      case "others":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner 
          message="Loading archives..." 
          variant="default"
          size="lg"
        />
      </div>
    );
  }

  if (archives.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No archives found
        </h3>
        <p className="text-sm text-muted-foreground">
          Start by adding your first archive document.
        </p>
      </div>
    );
  }

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
          {archives.map((archive) => (
            <TableRow
              key={archive.archive_id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onView(archive)}
            >
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
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
      
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages} ({total} total documents)
        </div>
        <div className="flex gap-2 items-center">
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
      </div>
    </>
  );
};

export default ArchivesTable;
