import { useState } from 'react';
import { FiEdit, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSystemManagement } from '@/hooks/systems/useSystemManagement';
import type { System } from '@/services/api/system.service';
import { AddSystemModal } from '@/components/modals/systems/AddSystemModal';
import { EditSystemModal } from '@/components/modals/systems/EditSystemModal';
import { DeleteSystemModal } from '@/components/modals/systems/DeleteSystemModal';

export const SystemTabs = () => {
  const { systems, isLoading } = useSystemManagement();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<System | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-heading-700">Systems</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage system labels used across pages and roles
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary-600 hover:bg-primary-700"
          onClick={() => setIsAddOpen(true)}
        >
          <FiPlus size={14} className="mr-1" />
          Add System
        </Button>
      </div>

      {/* Systems Table */}
      <Card>
        <CardContent className="!p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-gray-500">Loading systems...</div>
            </div>
          ) : systems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p>No systems found.</p>
              <Button
                variant="link"
                className="text-primary-600 mt-2"
                onClick={() => setIsAddOpen(true)}
              >
                Add the first system
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {system.slug}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-heading-700">
                      {system.label}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-primary-600"
                          onClick={() => setEditingSystem(system)}
                          disabled={system.slug === 'unassigned'}
                        >
                          <FiEdit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-red-600"
                          onClick={() => setDeletingSystem(system)}
                          disabled={system.slug === 'unassigned'}
                        >
                          <FiTrash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddSystemModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditSystemModal
        open={!!editingSystem}
        onClose={() => setEditingSystem(null)}
        system={editingSystem}
      />
      <DeleteSystemModal
        open={!!deletingSystem}
        onClose={() => setDeletingSystem(null)}
        system={deletingSystem}
      />
    </div>
  );
};
