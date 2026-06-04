/**
 * useAmeliorationSettings.ts
 *
 * Fetches social amelioration settings (disability types, grade levels, etc.)
 * used in ResidentClassificationsForm dropdown fields.
 *
 * Setting types: DISABILITY_TYPE, GRADE_LEVEL, SOLO_PARENT_CATEGORY, PENSION_TYPE, VOCATIONAL_STUDENT, COLLEGE_STUDENT
 */

import { useState, useEffect, useCallback } from 'react';
import { socialAmeliorationSettingApi, type SettingOption } from '@/services/api/social-amelioration-setting.service';

const SETTING_TYPES = [
  'DISABILITY_TYPE',
  'GRADE_LEVEL',
  'SOLO_PARENT_CATEGORY',
  'PENSION_TYPE',
  'VOCATIONAL_STUDENT',
  'COLLEGE_STUDENT',
] as const;

type SettingType = typeof SETTING_TYPES[number];

interface SettingsMap {
  [type: string]: Array<{ id: string; name: string }>;
}

export const useAmeliorationSettings = () => {
  const [settingsMap, setSettingsMap] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          SETTING_TYPES.map((type) =>
            socialAmeliorationSettingApi
              .getSettings({ type })
              .then((items) => ({ type, items }))
              .catch(() => ({ type, items: [] as SettingOption[] }))
          )
        );

        if (!cancelled) {
          const map: SettingsMap = {};
          results.forEach(({ type, items }) => {
            map[type] = items.map((item) => ({ id: item.id, name: item.name }));
          });
          setSettingsMap(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  /** Returns settings array for the given type, e.g. getSettingsByType('DISABILITY_TYPE') */
  const getSettingsByType = useCallback(
    (type: SettingType) => settingsMap[type] ?? [],
    [settingsMap]
  );

  return { getSettingsByType, settingsLoading: loading };
};
