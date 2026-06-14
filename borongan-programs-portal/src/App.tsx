import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes';
import { queryClient } from './lib/query-client';
import { Toaster } from './components/ui/toaster';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';

export const App: React.FC = () => {
  if (import.meta.env.VITE_MAINTENANCE_MODE === 'true') {
    return <MaintenanceOverlay message={import.meta.env.VITE_MAINTENANCE_MESSAGE as string | undefined} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
};
