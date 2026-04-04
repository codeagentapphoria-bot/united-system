import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActivities, useActivitiesFilter, useActivitiesPagination } from "@/hooks/useActivities";

const ActivitiesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTable, setFilterTable] = useState("all");
  const [filterOperation, setFilterOperation] = useState("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Custom hooks for performance optimization
  const { activities, loading, lastFetchTime, loadActivities } = useActivities(100);
  const { filteredActivities, uniqueValues } = useActivitiesFilter(activities, {
    searchTerm: debouncedSearchTerm,
    filterType,
    filterTable,
    filterOperation
  });
  const {
    paginatedActivities,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
    setCurrentPage
  } = useActivitiesPagination(filteredActivities, 20);

  // Memoized icon component getter
  const getIconComponent = useCallback((iconName) => {
    const iconMap = {
      Users,
      FileText,
      MessageSquare,
      Package,
      Activity,
      Building,
      PawPrint,
      User,
      MapPin,
      Building2,
      Home
    };
    return iconMap[iconName] || Activity;
  }, []);

  // Memoized export function
  const exportActivities = useCallback(() => {
    // Create more detailed CSV content
    const csvContent = [
      [
        "Timestamp",
        "Date & Time", 
        "Action",
        "User",
        "Details",
        "Type",
        "Table",
        "Operation",
        "Record ID",
        "Time Ago"
      ],
      ...filteredActivities.map(activity => [
        activity.timestamp,
        new Date(activity.timestamp).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        activity.action,
        activity.user,
        activity.details,
        activity.type,
        activity.tableName,
        activity.operation,
        activity.recordId || 'N/A',
        activity.time
      ])
    ];

    // Properly escape CSV values to handle commas and quotes
    const escapedContent = csvContent.map(row => 
      row.map(cell => {
        const cellStr = String(cell || '');
        // If cell contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    const blob = new Blob([escapedContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `activities-export-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `${filteredActivities.length} activities exported to CSV`,
    });
  }, [filteredActivities, toast]);

  // Reset page when filters change
  const handleFilterChange = useCallback((filterName, value) => {
    setCurrentPage(1);
    switch (filterName) {
      case 'search':
        setSearchTerm(value);
        break;
      case 'type':
        setFilterType(value);
        break;
      case 'table':
        setFilterTable(value);
        break;
      case 'operation':
        setFilterOperation(value);
        break;
    }
  }, [setCurrentPage]);

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">System Activities</h1>
          <p className="text-xs sm:text-sm text-gray-600">Monitor all system activities and changes</p>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {[...Array(10)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-2 sm:h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">System Activities</h1>
          <p className="text-xs sm:text-sm text-gray-600">Monitor all system activities and changes</p>
        </div>
        <Button
          onClick={() => loadActivities(true)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
        >
          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={filterType} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="table">Table</Label>
              <Select value={filterTable} onValueChange={(value) => handleFilterChange('table', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.tables.map(table => (
                    <SelectItem key={table} value={table}>
                      {table === "all" ? "All Tables" : table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="operation">Operation</Label>
              <Select value={filterOperation} onValueChange={(value) => handleFilterChange('operation', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  <SelectItem value="INSERT">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Showing {paginatedActivities.length} of {filteredActivities.length} activities
            {filteredActivities.length !== activities.length && ` (filtered from ${activities.length} total)`}
          </p>
          {lastFetchTime > 0 && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={exportActivities}
            variant="outline"
            size="sm"
            disabled={filteredActivities.length === 0}
            className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-3 sm:space-y-4">
        {paginatedActivities.length > 0 ? (
          <>
            {paginatedActivities.map((activity) => {
              const Icon = getIconComponent(activity.icon);
              return (
                <Card key={activity.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${activity.type === "success"
                            ? "bg-green-100 text-green-600"
                            : activity.type === "warning"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground text-sm sm:text-base">{activity.action}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                              {activity.details}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="hidden sm:inline">{activity.user}</span>
                              <span className="sm:hidden">{activity.user.split(' ')[0]}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {activity.time}
                            </span>
                            <span className="px-2 py-1 bg-muted rounded text-xs">
                              {activity.tableName}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${activity.operation === "INSERT" ? "bg-green-100 text-green-700" :
                                activity.operation === "UPDATE" ? "bg-blue-100 text-blue-700" :
                                  "bg-red-100 text-red-700"
                              }`}>
                              {activity.operation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-4 sm:mt-6">
                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={!hasPrevPage}
                    className="text-xs sm:text-sm"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!hasNextPage}
                    className="text-xs sm:text-sm"
                  >
                    Next
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <Activity className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-base sm:text-lg font-medium text-muted-foreground mb-2">
                No activities found
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {searchTerm || filterType !== "all" || filterTable !== "all" || filterOperation !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "No activities have been recorded yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ActivitiesPage;
