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
      <div className="flex flex-col items-center justify-center h-48 bg-white rounded-lg border border-gray-200">
        <FiShield size={32} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">Access control is not available in this version</p>
        <p className="text-xs text-gray-400 mt-1">Contact your system administrator to manage staff permissions</p>
      </div>
    </div>
  );
}
