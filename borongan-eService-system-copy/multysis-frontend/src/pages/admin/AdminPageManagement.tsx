import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  AddPageModal,
  DeletePageModal,
  EditPageModal,
} from '@/components/modals/pages';
import { PageTabs } from '@/components/pages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { adminMenuItems } from '@/config/admin-menu';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageManagement } from '@/hooks/pages/usePageManagement';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { FiDownload, FiFile, FiPlus, FiSearch } from 'react-icons/fi';

export default function AdminPageManagement() {
  const {
    pages,
    selectedPage,
    setSelectedPage,
    isLoading,
    error,
    deletePage,
    // Pagination
    currentPage,
    goToPage,
    goToNextPage: _goToNextPage,
    goToPreviousPage: _goToPreviousPage,
  } = usePageManagement();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Debounce search query
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Update the actual search query when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  // Reset page when filters change
  useEffect(() => {
    goToPage(1);
  }, [debouncedSearchQuery, statusFilter]);

  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.system.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Apply pagination to filtered results
  const totalFilteredPages = Math.max(1, Math.ceil(filteredPages.length / 10));
  const startIndex = (currentPage - 1) * 10;
  const endIndex = startIndex + 10;
  const paginatedFilteredPages = filteredPages.slice(startIndex, endIndex);

  // Pagination wrapper functions that respect filtered results
  const handleGoToPage = (page: number) => {
    const clampedPage = Math.max(1, Math.min(page, totalFilteredPages));
    goToPage(clampedPage);
  };

  const handleGoToNextPage = () => {
    if (currentPage < totalFilteredPages) {
      goToPage(currentPage + 1);
    }
  };

  const handleGoToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleDownload = () => {
    const headers = ['Name', 'System', 'Path', 'Created Date'];
    const rows = filteredPages.map((page) => [
      page.name,
      page.system,
      page.path,
      new Date(page.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pages-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeletePage = async () => {
    if (selectedPage) {
      try {
        await deletePage(selectedPage.id);
      } catch (err) {
        console.error('Failed to delete page:', err);
      }
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">Page Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage redirect pages for each system
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              onClick={handleDownload}
            >
              <div className="mr-2">
                <FiDownload size={16} />
              </div>
              Download List
            </Button>
            <Button
              className="bg-primary-600 hover:bg-primary-700"
              onClick={() => setIsAddModalOpen(true)}
            >
              <div className="mr-2">
                <FiPlus size={16} />
              </div>
              Add New Page
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Main Content: List + Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Pages List */}
          <Card className="lg:col-span-1 overflow-visible">
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
                <FiFile size={20} />
                Pages List
              </CardTitle>

              {/* Search */}
              <div className="relative mt-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search pages..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Total count */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
                <span>Total: {filteredPages.length} pages</span>
                <span>
                  Page {currentPage} of {totalFilteredPages}
                </span>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col">
              <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                {paginatedFilteredPages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No pages found.</div>
                ) : (
                  paginatedFilteredPages.map((page) => (
                    <div key={page.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedPage?.id === page.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedPage(page)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{page.name}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{page.path}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {page.system}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pointing Arrow - Only on large screens */}
                      {selectedPage?.id === page.id && (
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalFilteredPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalFilteredPages}
                  onPageChange={handleGoToPage}
                  onPrevious={handleGoToPreviousPage}
                  onNext={handleGoToNextPage}
                  isLoading={isLoading}
                />
              )}
            </CardContent>
          </Card>

          {/* Right: Selected Page Information */}
          <Card className="lg:col-span-2">
            <CardContent className="max-h-[700px] overflow-y-auto !p-6">
              <PageTabs
                selectedPage={selectedPage}
                onEdit={() => setIsEditModalOpen(true)}
                onDelete={() => setIsDeleteModalOpen(true)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddPageModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        isLoading={isLoading}
      />

      <EditPageModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        page={selectedPage}
        isLoading={isLoading}
      />

      <DeletePageModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeletePage}
        pageName={selectedPage?.name || ''}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
