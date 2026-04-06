import { useState, useEffect } from 'react';
import api from '@/utils/api';

const SETTING_TYPES = ['DISABILITY_TYPE', 'GRADE_LEVEL', 'SOLO_PARENT_CATEGORY', 'PENSION_TYPE'];

/**
 * Fetches all social_amelioration_settings types in one shot and provides
 * a lookup function for use in ResidentClassificationsForm dynamic fields.
 */
export const useAmeliorationSettings = () => {
  const [settingsMap, setSettingsMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all(
      SETTING_TYPES.map((type) =>
        api
          .get(`/social-amelioration-settings?type=${type}`)
          .then((res) => ({ type, data: res.data.data || [] }))
          .catch(() => ({ type, data: [] }))
      )
    )
      .then((results) => {
        const map = {};
        results.forEach(({ type, data }) => { map[type] = data; });
        setSettingsMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Returns array of { id, name, description } for the given settingType */
  const getSettingsByType = (type) => settingsMap[type] || [];

  return { getSettingsByType, settingsLoading: loading };
};
