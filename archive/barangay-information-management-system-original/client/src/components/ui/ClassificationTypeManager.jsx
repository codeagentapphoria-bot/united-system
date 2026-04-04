import React, { useState } from 'react';
import logger from '@/utils/logger';
import { useClassificationTypes } from '../../hooks/useClassificationTypes';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Badge } from './badge';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ClassificationDetailsEditor from './ClassificationDetailsEditor';

const classificationTypeSchema = z.object({
  name: z.string().min(1, "Classification name is required"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
  details: z.array(z.object({
    key: z.string().min(1, "Field key is required"),
    label: z.string().min(1, "Field label is required"),
    type: z.enum(["text", "select"]),
    options: z.array(z.object({
      value: z.string(),
      label: z.string()
    })).optional()
  })).optional(),
});

const ClassificationTypeManager = () => {
  const {
    classificationTypes,
    loading,
    createClassificationType,
    updateClassificationType,
    deleteClassificationType,
  } = useClassificationTypes();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(classificationTypeSchema),
  });

  const handleOpenDialog = (type = null) => {
    setEditingType(type);
    if (type) {
      reset({
        name: type.name,
        description: type.description || '',
        color: type.color,
        details: type.details || [],
      });
    } else {
      reset({
        name: '',
        description: '',
        color: '#4CAF50',
        details: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    reset();
  };

  const onSubmit = async (data) => {
    logger.debug('Form data being submitted:', data);
    
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingType) {
        await updateClassificationType(editingType.id, data);
      } else {
        await createClassificationType(data);
      }
      handleCloseDialog();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (type) => {
    setDeletingType(type);
  };

  const confirmDelete = async () => {
    if (deletingType) {
      // Prevent multiple submissions
      if (isSubmitting) {
        return;
      }
      
      setIsSubmitting(true);
      try {
        await deleteClassificationType(deletingType.id);
        setDeletingType(null);
      } catch (error) {
        // Error handling is done in the hook
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Classification Types</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage different types of resident classifications
                </CardDescription>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" className="gap-2 w-full sm:w-auto text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  Add Classification Type
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingType ? 'Edit Classification Type' : 'Add New Classification Type'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingType 
                      ? 'Update the classification type details below.'
                      : 'Create a new classification type for residents. You can add custom form fields for each classification.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Classification Name *</Label>
                        <Input
                          id="name"
                          {...register('name')}
                          placeholder="Enter classification name"
                          className="h-12"
                        />
                        {errors.name && (
                          <p className="text-sm text-red-600">{errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          {...register('description')}
                          placeholder="Enter description (optional)"
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="color">Color *</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="colorPicker"
                            type="color"
                            value={watch('color') || '#4CAF50'}
                            onChange={(e) => setValue('color', e.target.value)}
                            className="w-16 h-12 p-1"
                          />
                          <Input
                            {...register('color')}
                            placeholder="#4CAF50"
                            className="flex-1 h-12"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Choose a color to help identify this classification type
                        </p>
                        {errors.color && (
                          <p className="text-sm text-red-600">{errors.color.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Custom Form Fields</Label>
                    <p className="text-sm text-gray-600">
                      Add custom fields that will appear when assigning this classification to residents
                    </p>
                    <ClassificationDetailsEditor
                      details={watch('details') || []}
                      onChange={(details) => setValue('details', details)}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          {editingType ? 'Updating...' : 'Creating...'}
                        </div>
                      ) : (
                        editingType ? 'Update Classification Type' : 'Create Classification Type'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading classification types...</p>
            </div>
          ) : classificationTypes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Classification Types
              </h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first classification type.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {classificationTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{type.name}</h4>
                      {type.description && (
                        <p className="text-sm text-gray-600">{type.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(type)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(type)}
                      className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Classification Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingType?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeletingType(null)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="w-full sm:w-auto">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassificationTypeManager;
