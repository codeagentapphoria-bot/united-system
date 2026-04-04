/**
 * AdminCitizens.tsx
 *
 * Citizens and Residents are now unified under the residents table.
 * This page redirects to /admin/subscribers (the Residents list page).
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { adminMenuItems } from '@/config/admin-menu';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AdminCitizens: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/admin/subscribers', { replace: true });
  }, [navigate]);

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Redirecting to Residents…
      </div>
    </DashboardLayout>
  );
};
