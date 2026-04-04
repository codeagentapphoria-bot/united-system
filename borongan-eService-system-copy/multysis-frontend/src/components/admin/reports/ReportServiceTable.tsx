import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FiExternalLink, FiDownload } from 'react-icons/fi';
import { exportToCSV } from '@/utils/csv-export';

interface ReportServiceTableProps {
  reports: any[];
  isLoading: boolean;
}

export const ReportServiceTable: React.FC<ReportServiceTableProps> = ({ reports, isLoading }) => {
  const navigate = useNavigate();

  const handleExport = () => {
    const exportData = reports.map((r) => ({
      serviceName: r.service.name,
      serviceCode: r.service.code,
      totalTransactions: r.total,
      revenue: r.totalRevenue,
      pending: r.pending,
      approved: r.approved,
      rejected: r.rejected,
      cancelled: r.cancelled,
    }));

    exportToCSV(exportData, 'egov-service-report', {
      serviceName: 'Service Name',
      serviceCode: 'Service Code',
      totalTransactions: 'Total Transactions',
      revenue: 'Revenue (₱)',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No services found matching your criteria</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end px-1">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExport}
          className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-700"
        >
          <FiDownload className="mr-2" />
          Export to CSV
        </Button>
      </div>

      <div className="rounded-md border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold">Service</TableHead>
              <TableHead className="text-right font-semibold">Volume</TableHead>
              <TableHead className="text-right font-semibold">Revenue</TableHead>
              <TableHead className="text-center font-semibold">Status Breakdown</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow 
                key={report.service.id} 
                className="hover:bg-gray-50 cursor-pointer group"
                onClick={() => navigate(`/admin/e-government/${report.service.code.toLowerCase().replace(/_/g, '-')}`)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-heading-700 group-hover:text-primary-600 transition-colors">
                      {report.service.name}
                    </span>
                    <span className="text-xs text-gray-500 uppercase">{report.service.code}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {report.total.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium text-green-700">
                  ₱{report.totalRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1.5">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 px-1.5 py-0">
                      {report.pending} P
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-1.5 py-0">
                      {report.approved} A
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-1.5 py-0">
                      {report.rejected} R
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <FiExternalLink size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-gray-400 italic px-1">
        * Click on any service row to view detailed transaction list.
      </p>
    </div>
  );
};

