import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSystemSchema, type CreateSystemInput } from '@/validations/system.schema';
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

interface AddSystemModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddSystemModal({ open, onClose }: AddSystemModalProps) {
  const { createSystem, isCreating } = useSystemManagement();

  const form = useForm<CreateSystemInput>({
    resolver: zodResolver(createSystemSchema),
    defaultValues: { slug: '', label: '' },
  });

  const onSubmit = async (data: CreateSystemInput) => {
    await createSystem(data);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add System</DialogTitle>
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
              <Button type="submit" disabled={isCreating}>
                Add System
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
