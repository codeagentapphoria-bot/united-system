import { FleetMap } from '@/components/admin/FleetMap';

export function FleetSection() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">Live positions of all active buses.</p>
      <FleetMap />
    </div>
  );
}
