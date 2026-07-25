import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CompactPagination } from "@/components/ui/compact-pagination";
import { FileText, Calendar, User } from "lucide-react";

const ArchivesTable = ({
  archives = [],
  loading = false,
  onView,
  page = 1,
  totalPages = 1,
  perPage = 10,
  total = 0,
  setPage,
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

export default ArchivesTable;
