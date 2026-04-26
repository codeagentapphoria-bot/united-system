// Thin router — all section logic has been extracted to ./libre-sakay/
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { libresakayMenuItems } from '@/config/libre-sakay-menu';
import { portalProgramsService } from '@/services/api/portal-programs.service';
import {
  DashboardSection,
  FleetSection,
  BusesTab,
  RoutesTab,
  DriversTab,
  StopsTab,
  RideLogsSection,
  ApplicationsSection,
  AccessControlSection,
  VerificationSection,
  ProgramSettingsSection,
  SECTION_TITLES,
} from './libre-sakay';

export const AdminLibreSakay: React.FC = () => {
  const { section = 'dashboard' } = useParams<{ section: string }>();

  const { data: pendingData } = useQuery({
    queryKey: ['libre-sakay', 'pending-apps-badge'],
    queryFn: () =>
      portalProgramsService.listApplicationsAdmin({
        status: 'pending',
        programId: 'gp-all-libre-sakay',
        limit: 1,
      }),
    retry: false,
  });

  const pendingCount = pendingData?.pagination.total ?? 0;

  // Inject badge count into the Program Applications menu item
  const menuItems = libresakayMenuItems.map(item => {
    if (item.path === '/admin/libre-sakay/applications') {
      return { ...item, badgeCount: pendingCount };
    }
    return item;
  });

  const renderSection = () => {
    switch (section) {
      case 'dashboard':
        return <DashboardSection />;
      case 'fleet':
        return <FleetSection />;
      case 'buses':
        return <BusesTab />;
      case 'routes':
        return <RoutesTab />;
      case 'drivers':
        return <DriversTab />;
      case 'stops':
        return <StopsTab />;
      case 'ride-logs':
        return <RideLogsSection />;
      case 'applications':
        return <ApplicationsSection />;
      case 'access-control':
        return <AccessControlSection />;
      case 'verification':
        return <VerificationSection />;
      case 'settings':
        return <ProgramSettingsSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <DashboardLayout menuItems={menuItems}>
      {/* Access control handled by child routes - parent is just a layout */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{SECTION_TITLES[section] ?? 'Libre Sakay'}</h1>
        <p className="text-sm text-gray-500 mt-1">Libre Sakay Administration</p>
      </div>
      {renderSection()}
    </DashboardLayout>
  );
};
