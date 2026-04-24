import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { adminMenuItems } from '@/config/admin-menu';
import { usePageManagement } from '@/hooks/pages/usePageManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { AddPageModal, EditPageModal, DeletePageModal } from '@/components/modals/pages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';

export default function AdminPageManagement() {
  const {
    pages,
    selectedPage,
    setSelectedPage,
    isLoading,
    deletePage,
    currentPage,
    totalPages,
    goToNextPage,
    goToPreviousPage,
  } = usePageManagement();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredPages = useMemo(() => {
    if (!debouncedSearch) return pages;
    const q = debouncedSearch.toLowerCase();
    return pages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        p.system.toLowerCase().includes(q)
    );
  }, [pages, debouncedSearch]);

  const handleEdit = (page: (typeof pages)[0]) => {
    setSelectedPage(page);
    setIsEditModalOpen(true);
  };

  const handleDelete = (page: (typeof pages)[0]) => {
    setSelectedPage(page);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPage) return;
    await deletePage(selectedPage.id);
    setIsDeleteModalOpen(false);
    setSelectedPage(null);
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Page Management</h1>
            <p className="text-muted-foreground text-sm">
              Manage redirect pages for each system
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Page
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by name, path, or system..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Page List */}
          <div className="lg:col-span-1 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No pages found</div>
            ) : (
              filteredPages.map((page) => (
                <Card
                  key={page.id}
                  className={`cursor-pointer hover:bg-accent transition-colors ${
                    selectedPage?.id === page.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedPage(page)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{page.name}</p>
                        <p className="text-xs text-muted-foreground">{page.path}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {page.system}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(page);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(page);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedPage ? (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedPage.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">System</p>
                      <p className="text-sm">{selectedPage.system}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Path</p>
                      <p className="text-sm font-mono">{selectedPage.path}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {new Date(selectedPage.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <p className="text-muted-foreground">Select a page to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddPageModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <EditPageModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        page={selectedPage}
      />
      <DeletePageModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        pageName={selectedPage?.name ?? ''}
      />
    </DashboardLayout>
  );
}