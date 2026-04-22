/**
 * classificationType.service.ts
 *
 * API client for admin classification management.
 * Endpoints mounted on the E-Service backend:
 *   POST /api/classification          — assign classification to resident
 *   GET  /api/classification/types     — list classification types for municipality
 */

import api from './auth.service';

export interface ClassificationType {
  id: number;
  municipality_id: number;
  name: string;
  description: string | null;
  color: string | null;
  details: ClassificationDetail[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassificationDetail {
  key: string;
  label: string;
  type: 'text' | 'select' | 'amelioration_select' | 'amelioration_multiselect';
  options?: { value: string; label: string }[];
  settingType?: string;
  filterIds?: string[];
}

export interface InsertClassificationInput {
  residentId: string;
  classificationType: string;
  classificationDetails?: Record<string, unknown>;
}

export const classificationTypeService = {
  /**
   * Assign a classification type to a resident.
   * POST /api/classification
   */
  async insertClassification(data: InsertClassificationInput): Promise<void> {
    const response = await api.post('/classification', data);
    return response.data;
  },

  /**
   * Fetch all active classification types for a municipality.
   * GET /api/classification/types?municipalityId=1
   */
  async getClassificationTypes(municipalityId: number): Promise<ClassificationType[]> {
    const response = await api.get(`/classification/types?municipalityId=${municipalityId}`);
    return response.data.data ?? [];
  },
};

export default classificationTypeService;
