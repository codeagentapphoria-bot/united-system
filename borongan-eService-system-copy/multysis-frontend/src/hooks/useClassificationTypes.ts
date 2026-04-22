/**
 * useClassificationTypes.ts
 *
 * Fetches active classification types for a municipality.
 * Used by ResidentClassificationsForm in the admin registration workflow.
 */

import { useState, useEffect } from 'react';
import { classificationTypeService } from '@/services/api/classificationType.service';
import { useToast } from '@/hooks/use-toast';

const isDev = import.meta.env.DEV;

export interface ClassificationTypeOption {
  key: string;
  label: string;
  color: string;
  description: string;
  details: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'amelioration_select' | 'amelioration_multiselect';
    options?: Array<{ value: string; label: string }>;
    settingType?: string;
    filterIds?: string[];
  }>;
}

export const useClassificationTypes = (municipalityId?: number) => {
  const [classificationTypes, setClassificationTypes] = useState<ClassificationTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!municipalityId) {
      setClassificationTypes([]);
      return;
    }

    let cancelled = false;

    const fetchTypes = async () => {
      setLoading(true);
      setError(null);
      try {
        const types = await classificationTypeService.getClassificationTypes(municipalityId);
        if (!cancelled) {
          const options: ClassificationTypeOption[] = types.map((t) => ({
            key: t.name,
            label: t.name,
            color: t.color ?? '#4CAF50',
            description: t.description ?? '',
            details: Array.isArray(t.details) ? t.details as ClassificationTypeOption['details'] : [],
          }));
          setClassificationTypes(options);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load classification types');
          if (isDev) console.error('[useClassificationTypes]', err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load classification types',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTypes();
    return () => { cancelled = true; };
  }, [municipalityId, toast]);

  return { classificationTypes, loading, error };
};
