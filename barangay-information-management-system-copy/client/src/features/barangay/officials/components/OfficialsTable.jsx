import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Edit, Trash2, Calendar, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
const SERVER_URL   = import.meta.env.VITE_SERVER_URL        || "http://localhost:5000";
const ESERVICE_URL = import.meta.env.VITE_ESERVICE_SERVER_URL || "http://localhost:3000";
const toAbsUrl = (p) => {
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const clean = p.replace(/\\/g, "/").replace(/^\/+/, "");
  if (clean.startsWith("uploads/images/")) return `${ESERVICE_URL}/${clean}`;
  return `${SERVER_URL}/${clean}`;
};

const OfficialsTable = ({
  officials,
  loading,
  error,
  onView,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Official</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Committee</TableHead>
          <TableHead>Term</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="py-16 text-center text-gray-400 text-sm">
              Loading…
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell colSpan={5} className="py-16 text-center text-red-500 text-sm">
              {error}
            </TableCell>
          </TableRow>
        ) : officials.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-16 text-center text-gray-400 text-sm">
              No officials found.
            </TableCell>
          </TableRow>
        ) : officials.map((official) => (
          <TableRow key={official.official_id}>
            <TableCell>
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={toAbsUrl(official.picture_path)} />
                  <AvatarFallback>
                    {getInitials(official.first_name, official.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {official.first_name} {official.last_name}
                    {official.suffix && ` ${official.suffix}`}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="font-medium">{official.position}</div>
            </TableCell>
            <TableCell>
              <div className="text-sm">{official.committee || "N/A"}</div>
            </TableCell>
            <TableCell>
              <div className="text-xs">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{formatDate(official.term_start)}</span>
                </div>
                {official.term_end && (
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{formatDate(official.term_end)}</span>
                  </div>
                )}
              </div>
            </TableCell>

            <TableCell className="text-right">
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(official)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(official)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(official)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>

    </Table>
  );
};

export default OfficialsTable;
