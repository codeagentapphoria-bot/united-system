import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Page } from '@/services/api/page.service';
import React from 'react';
import { FiEdit, FiFile, FiTrash2 } from 'react-icons/fi';

interface PageTabsProps {
  selectedPage: Page | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const PageTabs: React.FC<PageTabsProps> = ({ selectedPage, onEdit, onDelete }) => {
  if (!selectedPage) {
    return (
      <div className={cn('text-center py-12 text-gray-500')}>
        Select a page to view details
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Overview */}
      <Card>
        <CardHeader>
          <div className={cn('flex items-center justify-between')}>
            <CardTitle className="text-xl text-heading-700 flex items-center gap-2">
              <FiFile size={20} />
              Page Overview
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {selectedPage.system}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className={cn('space-y-4')}>
          <div>
            <h3 className={cn('text-lg font-semibold text-heading-700')}>{selectedPage.name}</h3>
            <div className={cn('mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg')}>
              <p className="text-sm text-gray-600 font-mono">{selectedPage.path}</p>
            </div>
          </div>

          <div className={cn('flex gap-2')}>
            <Button
              size="sm"
              variant="outline"
              className={cn('text-primary-600 hover:text-primary-700 hover:bg-primary-50')}
              onClick={onEdit}
            >
              <FiEdit size={14} className="mr-1" />
              Edit Page
            </Button>
            <Button
              size="sm"
              className={cn('bg-red-600 hover:bg-red-700')}
              onClick={onDelete}
            >
              <FiTrash2 size={14} className="mr-1" />
              Delete Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Page Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-heading-700">Page Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <p className="text-gray-600">{new Date(selectedPage.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">System:</span>
              <p className="text-gray-600">{selectedPage.system}</p>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Path:</span>
              <p className="text-gray-600 font-mono">{selectedPage.path}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
