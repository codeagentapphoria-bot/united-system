// Thin router — all section logic has been extracted to ./libre-sakay/
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessControlGate } from '@/components/common/AccessControlGate';
import { portalProgramsService } from '@/services/api/portal-programs.service';
import { useLibreSakayBadgeOverrides } from '@/context/LibreSakayBadgeContext';
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
  const { setBadgeOverrides } = useLibreSakayBadgeOverrides();

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

  // Use ref to track the previous badge count — only call setBadgeOverrides when value actually changes
  const prevBadgeRef = useRef<number | undefined>(undefined);
  const pendingCount = pendingData?.pagination.total ?? 0;

  useEffect(() => {
    if (prevBadgeRef.current !== pendingCount) {
      prevBadgeRef.current = pendingCount;
      setBadgeOverrides(new Map([['/admin/libre-sakay/applications', pendingCount]]));
    }
  }, [pendingCount, setBadgeOverrides]);

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
    <DashboardLayout>
      <AccessControlGate pagePath="/admin/libre-sakay">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{SECTION_TITLES[section] ?? 'Libre Sakay'}</h1>
          <p className="text-sm text-gray-500 mt-1">Libre Sakay Administration</p>
        </div>
        {renderSection()}
      </AccessControlGate>
    </DashboardLayout>
  );
};
