import React, { useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  useClassificationOptions,
  type ClassificationField,
} from '@/hooks/useClassificationOptions';
import { OptionStringModal, type OptionStringMode } from '@/components/modals/classification-options';

const AMELIORATION_TYPES: { name: string; label: string }[] = [
  { name: 'Person with Disability', label: 'Disability Types' },
  { name: 'Student', label: 'Grade Levels' },
  { name: 'Senior Citizen', label: 'Pension Types' },
  { name: 'Solo Parent', label: 'Solo Parent Categories' },
  { name: 'Vocational Student', label: 'Vocational NC Levels' },
];

interface FieldEditorProps {
  typeName: string;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ typeName }) => {
  const { data, loading, error, patchDetails } = useClassificationOptions(typeName);
  const [modalMode, setModalMode] = useState<OptionStringMode | null>(null);
  const [targetFieldKey, setTargetFieldKey] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState<string>('');

  const selectFields = useMemo<ClassificationField[]>(
    () => (data?.details ?? []).filter((f) => f.type === 'select' || f.type === 'multiselect'),
    [data]
  );

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!data) return <p>No classification type found for "{typeName}"</p>;

  const openModal = (mode: OptionStringMode, fieldKey: string, value: string = '') => {
    setModalMode(mode);
    setTargetFieldKey(fieldKey);
    setTargetValue(value);
  };

  const closeModal = () => {
    setModalMode(null);
    setTargetFieldKey(null);
    setTargetValue('');
  };

  const applyChange = async (newValue: string) => {
    if (!modalMode || !targetFieldKey) return;
    const next = data.details.map((f) => {
      if (f.key !== targetFieldKey) return f;
      const current = f.options ?? [];
      let updated: string[];
      if (modalMode === 'add') updated = [...current, newValue];
      else if (modalMode === 'edit') updated = current.map((v) => (v === targetValue ? newValue : v));
      else updated = current.filter((v) => v !== newValue);
      return { ...f, options: updated };
    });
    await patchDetails(next);
  };

  return (
    <div className="space-y-4">
      {selectFields.map((field) => (
        <Card key={field.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">{field.label}</CardTitle>
            <Button size="sm" onClick={() => openModal('add', field.key)}>
              <FiPlus className="mr-1" /> Add Option
            </Button>
          </CardHeader>
          <CardContent>
            {(field.options ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">No options yet.</p>
            ) : (
              <ul className="space-y-1">
                {(field.options ?? []).map((opt) => (
                  <li key={opt} className="flex items-center justify-between rounded border p-2">
                    <span>{opt}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openModal('edit', field.key, opt)}>
                        <FiEdit2 />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openModal('delete', field.key, opt)}>
                        <FiTrash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {modalMode && targetFieldKey && (
        <OptionStringModal
          open
          mode={modalMode}
          fieldLabel={selectFields.find((f) => f.key === targetFieldKey)?.label ?? ''}
          initialValue={targetValue}
          existingValues={selectFields.find((f) => f.key === targetFieldKey)?.options ?? []}
          onClose={closeModal}
          onConfirm={applyChange}
        />
      )}
    </div>
  );
};

export const SettingsTab: React.FC = () => {
  const [active, setActive] = useState<string>(AMELIORATION_TYPES[0].name);

  return (
    <div className="space-y-4 p-4">
      <Tabs value={active} onValueChange={setActive}>
        <TabsList>
          {AMELIORATION_TYPES.map((t) => (
            <TabsTrigger key={t.name} value={t.name}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {AMELIORATION_TYPES.map((t) => (
          <TabsContent key={t.name} value={t.name} className="mt-4">
            <FieldEditor typeName={t.name} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default SettingsTab;
