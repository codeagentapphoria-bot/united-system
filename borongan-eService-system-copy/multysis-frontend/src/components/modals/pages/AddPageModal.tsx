import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPageSchema, type CreatePageInput } from '@/validations/page.schema';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePageManagement } from '@/hooks/pages/usePageManagement';

interface AddPageModalProps {
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

const SYSTEM_OPTIONS = [
  { value: 'BUP', label: 'BUP' },
  { value: 'MEO', label: 'MEO' },
  { value: 'CT', label: 'CT' },
  { value: 'OSCA', label: 'OSCA' },
];

export function AddPageModal({ open, onClose, isLoading }: AddPageModalProps) {
  const { createPage } = usePageManagement();
  const form = useForm<CreatePageInput>({
    resolver: zodResolver(createPageSchema),
    defaultValues: { system: '', path: '', name: '' },
  });

  const onSubmit = async (data: CreatePageInput) => {
    await createPage(data);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Page</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="system"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select system" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SYSTEM_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path</FormLabel>
                  <FormControl>
                    <Input placeholder="/admin/dashboard" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Admin Dashboard" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                Add Page
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}