import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Clock,
  Users,
  FileText,
  MessageSquare,
  Package,
  Building,
  Home,
  PawPrint,
  RefreshCw,
  User,
  MapPin,
  Building2,
  Search,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  useActivities,
  useActivitiesFilter,
  useActivitiesPagination,
} from "@/hooks/useActivities";

// ── Operation badge ───────────────────────────────────────────────────────────
const OPERATION_STYLE = {
  INSERT: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};
const OPERATION_LABEL = { INSERT: "Create", UPDATE: "Update", DELETE: "Delete" };

// ── Type icon background ──────────────────────────────────────────────────────
const TYPE_STYLE = {
  success: "bg-green-100 text-green-600",
  warning: "bg-yellow-100 text-yellow-600",
  info:    "bg-blue-100 text-blue-600",
};

const ICON_MAP = {
  Users, FileText, MessageSquare, Package,
  Activity, Building, PawPrint, User,
  MapPin, Building2, Home,
};

const ActivitiesPage = () => {
  const { user }   = useAuth();
  const { toast }  = useToast();

  const [searchTerm,          setSearchTerm]          = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType,          setFilterType]          = useState("all");
  const [filterTable,         setFilterTable]         = useState("all");
  const [filterOperation,     setFilterOperation]     = useState("all");
  const [perPage,             setPerPage]             = useState(10);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { activities, loading, lastFetchTime, loadActivities } = useActivities(100);
  const { filteredActivities, uniqueValues } = useActivitiesFilter(activities, {
    searchTerm: debouncedSearchTerm,
    filterType,
    filterTable,
    filterOperation,
  });
  const {
    paginatedActivities,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
    setCurrentPage,
  } = useActivitiesPagination(filteredActivities, perPage);

  const getIcon = useCallback(
    (name) => ICON_MAP[name] || Activity,
    []
  );

  const handleFilterChange = useCallback(
    (key, value) => {
      setCurrentPage(1);
      if (key === "search")    setSearchTerm(value);
      if (key === "type")      setFilterType(value);
      if (key === "table")     setFilterTable(value);
      if (key === "operation") setFilterOperation(value);
    },
    [setCurrentPage]
  );

  const exportActivities = useCallback(() => {
    const rows = [
      ["Timestamp", "Date & Time", "Action", "User", "Details", "Type", "Table", "Operation", "Record ID", "Time Ago"],
      ...filteredActivities.map((a) => [
        a.timestamp,
        new Date(a.timestamp).toLocaleString("en-US", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
        }),
        a.action, a.user, a.details, a.type, a.tableName, a.operation,
        a.recordId || "N/A", a.time,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell || "");
            return s.includes(",") || s.includes('"') || s.includes("\n")
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `activities-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast({ title: "Export successful", description: `${filteredActivities.length} activities exported.` });
  }, [filteredActivities, toast]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">System Activities</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor all system activities and changes.
            {lastFetchTime > 0 && (
              <span className="ml-2 text-gray-400">
                Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={exportActivities}
            disabled={filteredActivities.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => loadActivities(true)}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search activities…"
            value={searchTerm}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <Select value={filterType} onValueChange={(v) => handleFilterChange("type", v)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTable} onValueChange={(v) => handleFilterChange("table", v)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Table" />
          </SelectTrigger>
          <SelectContent>
            {uniqueValues.tables.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All Tables" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOperation} onValueChange={(v) => handleFilterChange("operation", v)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Operation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operations</SelectItem>
            <SelectItem value="INSERT">Create</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-gray-400 ml-auto">
          {filteredActivities.length}
          {filteredActivities.length !== activities.length && ` / ${activities.length}`}{" "}
          activit{filteredActivities.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
          ) : paginatedActivities.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500 font-medium">No activities found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm || filterType !== "all" || filterTable !== "all" || filterOperation !== "all"
                  ? "Try adjusting your filters."
                  : "No activities have been recorded yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead className="whitespace-nowrap">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedActivities.map((activity) => {
                  const Icon = getIcon(activity.icon);
                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className={`p-1.5 rounded-md inline-flex ${TYPE_STYLE[activity.type] || TYPE_STYLE.info}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">
                        {activity.action}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-[260px] truncate">
                        {activity.details}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          {activity.user}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {activity.tableName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${OPERATION_STYLE[activity.operation] || "bg-gray-100 text-gray-600"}`}>
                          {OPERATION_LABEL[activity.operation] || activity.operation}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {activity.time}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-xs sm:text-sm text-gray-500">
            Page {currentPage} of {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevPage}
              onClick={goToPrevPage}
              className="text-xs sm:text-sm"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={goToNextPage}
              className="text-xs sm:text-sm"
            >
              Next
            </Button>
          </div>
          <select
            className="w-full sm:w-24 border rounded px-2 py-1 text-xs sm:text-sm"
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </Card>

    </div>
  );
};

export default ActivitiesPage;
