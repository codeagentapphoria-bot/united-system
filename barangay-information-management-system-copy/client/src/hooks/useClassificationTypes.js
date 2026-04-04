import { useState, useEffect } from 'react';
import { classificationTypeService } from '../services/classificationTypeService';
import { useToast } from './use-toast';
import { handleError } from '@/utils/errorHandler';
import logger from '@/utils/logger';

export const useClassificationTypes = (municipalityId) => {
  const [classificationTypes, setClassificationTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  // Fetch classification types
  const fetchClassificationTypes = async () => {
    if (!municipalityId) {
      setError('municipalityId is required');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      logger.debug('Fetching classification types...');
      const response = await classificationTypeService.getClassificationTypes(municipalityId);
      logger.debug('Classification types response:', response);
      setClassificationTypes(response.data || []);
    } catch (err) {
      handleError(err, "Fetch Classification Types");
      setError(err.message || 'Failed to fetch classification types');
    } finally {
      setLoading(false);
    }
  };

  // Create classification type
  const createClassificationType = async (data) => {
    try {
      const response = await classificationTypeService.createClassificationType({ ...data, municipalityId });
      setClassificationTypes(prev => [...prev, response.data]);
      toast({
        title: "Success",
        description: "Classification type created successfully",
      });
      return response.data;
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create classification type",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Update classification type
  const updateClassificationType = async (id, data) => {
    try {
      const response = await classificationTypeService.updateClassificationType(id, data);
      setClassificationTypes(prev => 
        prev.map(type => type.id === id ? response.data : type)
      );
      toast({
        title: "Success",
        description: "Classification type updated successfully",
      });
      return response.data;
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update classification type",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Delete classification type
  const deleteClassificationType = async (id) => {
    try {
      await classificationTypeService.deleteClassificationType(id);
      setClassificationTypes(prev => prev.filter(type => type.id !== id));
      toast({
        title: "Success",
        description: "Classification type deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete classification type",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Get classification type by ID
  const getClassificationTypeById = async (id) => {
    try {
      const response = await classificationTypeService.getClassificationTypeById(id);
      return response.data;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch classification type",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Convert classification types to options format for select components
  const getClassificationTypeOptions = () => {
    return classificationTypes.map(type => ({
      value: type.name,
      label: type.name,
      color: type.color,
      description: type.description,
    }));
  };

  useEffect(() => {
    if (municipalityId) {
      fetchClassificationTypes();
    }
  }, [municipalityId]);

  return {
    classificationTypes,
    loading,
    error,
    fetchClassificationTypes,
    createClassificationType,
    updateClassificationType,
    deleteClassificationType,
    getClassificationTypeById,
    getClassificationTypeOptions,
  };
};
