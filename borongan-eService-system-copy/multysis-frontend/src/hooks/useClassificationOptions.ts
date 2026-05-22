/**
 * useClassificationOptions.ts
 *
 * Fetches a single classification type by name and provides a patch method
 * to update its details field. Replaces the 4 deleted hooks:
 * useDisabilityTypes, usePensionTypes, useGradeLevels, useSoloParentCategories.
 */

import { useCallback, useEffect, useState } from 'react';
import api from '@/services/api/auth.service';

export type ClassificationFieldType = 'text' | 'select' | 'multiselect';

export interface ClassificationField {
  key: string;
  label: string;
  type: ClassificationFieldType;
  options?: string[];
}

export interface ClassificationTypeWithFields {
  id: number;
  name: string;
  color?: string;
  details: ClassificationField[];
}

interface UseClassificationOptionsResult {
  data: ClassificationTypeWithFields | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  patchDetails: (details: ClassificationField[]) => Promise<void>;
}

export function useClassificationOptions(typeName: string): UseClassificationOptionsResult {
  const [data, setData] = useState<ClassificationTypeWithFields | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /classification-types/read?name=<typeName>
      // The backend returns { status: 'success', data: ClassificationType }.
      const res = await api.get('/classification-types/read', { params: { name: typeName } });
      const found: ClassificationTypeWithFields | null = res.data?.data ?? null;
      setData(found);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load classification options');
    } finally {
      setLoading(false);
    }
  }, [typeName]);

  useEffect(() => {
    if (!typeName) {
      setData(null);
      setLoading(false);
      return;
    }
    fetchData();
  }, [fetchData]);

  const patchDetails = useCallback(
    async (details: ClassificationField[]) => {
      if (!data?.id) throw new Error('Classification type not loaded');
      await api.patch(`/classification-types/${data.id}`, { details });
      await fetchData();
    },
    [data?.id, fetchData]
  );

  return { data, loading, error, refetch: fetchData, patchDetails };
}
