import { FiShield } from 'react-icons/fi';
import { Card, CardContent } from '@/components/ui/card';

export function AccessControlSection() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-50 rounded-lg">
              <FiShield size={22} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Libre Sakay Staff Management</h3>
              <p className="text-sm text-gray-500 mt-1">
                Create and manage accounts for Libre Sakay staff and administrators. Staff accounts have access to bus,
                route, driver, and stop management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-center h-48 bg-white rounded-lg border border-dashed border-gray-300">
        <p className="text-sm text-gray-400">Staff management coming soon</p>
      </div>
    </div>
  );
}
