import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { updateSystemSchema, type UpdateSystemInput } from '@/validations/system.schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSystemManagement } from '@/hooks/systems/useSystemManagement';
import type { System } from '@/services/api/system.service';

interface EditSystemModalProps {
  open: boolean;
  onClose: () => void;
  system: System | null;
}

export function EditSystemModal({ open, onClose, system }: EditSystemModalProps) {
  const { updateSystem, isUpdating } = useSystemManagement();

  const form = useForm<UpdateSystemInput>({
    resolver: zodResolver(updateSystemSchema),
    defaultValues: {
      slug: system?.slug ?? '',
      label: system?.label ?? '',
    },
  });

  // Reset form when system prop changes — useEffect prevents infinite re-render loop
  useEffect(() => {
    form.reset({
      slug: system?.slug ?? '',
      label: system?.label ?? '',
    });
  }, [system?.slug, system?.label, form]);

  const onSubmit = async (data: UpdateSystemInput) => {
    if (!system) return;
    await updateSystem(system.slug, data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit System</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. libre-sakay"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Libre Sakay" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
