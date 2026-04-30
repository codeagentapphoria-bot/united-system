// Thin router — all section logic has been extracted to ./city-population/
import React from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessControlGate } from '@/components/common/AccessControlGate';
import {
  DashboardSection,
  ResidentsSection,
  RegistrationsSection,
  SECTION_TITLES,
} from './city-population';

export const AdminCityPopulation: React.FC = () => {
  const { section = 'dashboard' } = useParams<{ section: string }>();

  // RegistrationsSection = AdminRegistrationWorkflow which has its own
  // DashboardLayout + AccessControlGate pagePath="/admin/city-population".
  // Do NOT wrap in DashboardLayout here — that would double-nest.
  if (section === 'registrations') {
    return <RegistrationsSection />;
  }

  return (
    <DashboardLayout>
      <AccessControlGate pagePath="/admin/city-population">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{SECTION_TITLES[section] ?? 'City Population'}</h1>
          <p className="text-sm text-gray-500 mt-1">City Population Administration</p>
        </div>
        {section === 'dashboard' && <DashboardSection />}
        {section === 'residents' && <ResidentsSection />}
      </AccessControlGate>
    </DashboardLayout>
  );
};
