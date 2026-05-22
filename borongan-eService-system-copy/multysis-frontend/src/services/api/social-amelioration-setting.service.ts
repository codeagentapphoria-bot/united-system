/**
 * social-amelioration-setting.service.ts
 *
 * API client for social amelioration classification option lookups.
 * Options live in classification_types.details (the old social_amelioration_settings
 * table was dropped — data migrated to classification_types).
 *
 * Endpoint: GET /api/portal-registration/classification-options
 */

import api from './auth.service';

export interface SettingOption {
  id: string;
  name: string;
}

/** Map of CSV setting type → { typeName, fieldKey } for getClassificationOptions */
const SETTING_MAP: Record<string, { typeName: string; fieldKey?: string }> = {
  PENSION_TYPE: { typeName: 'Senior Citizen', fieldKey: 'pensionType' },
  DISABILITY_TYPE: { typeName: 'PWD', fieldKey: 'disabilityType' },
  GRADE_LEVEL: { typeName: 'Student', fieldKey: 'gradeLevel' },
  SOLO_PARENT_CATEGORY: { typeName: 'Solo Parent', fieldKey: 'category' },
  COLLEGE_STUDENT: { typeName: 'College Student' },
  VOCATIONAL_STUDENT: { typeName: 'Vocational Student', fieldKey: 'ncLevel' },
};

export const socialAmeliorationSettingApi = {
  /**
   * Fetch classification option lookup values by setting type.
   * Falls back to empty array on error so CSV export still proceeds.
   *
   * @param municipalityId  Municipality ID for the lookup
   * @param settingType     One of: PENSION_TYPE | DISABILITY_TYPE | GRADE_LEVEL | SOLO_PARENT_CATEGORY
   */
  async getSettings({
    municipalityId,
    type,
  }: {
    municipalityId: number;
    type: 'PENSION_TYPE' | 'DISABILITY_TYPE' | 'GRADE_LEVEL' | 'SOLO_PARENT_CATEGORY' | 'VOCATIONAL_STUDENT' | 'COLLEGE_STUDENT';
  }): Promise<SettingOption[]> {
    const mapping = SETTING_MAP[type];
    if (!mapping) return [];

    try {
      const params = new URLSearchParams({
        municipalityId: String(municipalityId),
        typeName: mapping.typeName,
        ...(mapping.fieldKey ? { fieldKey: mapping.fieldKey } : {}),
      });
      const response = await api.get(`/portal-registration/classification-options?${params}`);
      return response.data?.data ?? [];
    } catch {
      return [];
    }
  },
};

export default socialAmeliorationSettingApi;
