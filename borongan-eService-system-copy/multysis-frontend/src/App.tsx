import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './context/AuthContext';
import { LoginSheetProvider } from './context/LoginSheetContext';
import { SocketProvider } from './context/SocketContext';
import { LibreSakayBadgeProvider } from './context/LibreSakayBadgeContext';
import { CityPopulationBadgeProvider } from './context/CityPopulationBadgeContext';
import { router } from './routes';
import { queryClient } from './lib/query-client';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';
import { ErrorFallback } from './components/common/ErrorFallback';

interface AppProps {}

export const App: React.FC<AppProps> = () => {
  if (
    import.meta.env.VITE_MAINTENANCE_ADMIN === 'true' ||
    import.meta.env.VITE_MAINTENANCE_PORTAL === 'true'
  ) {
    return (
      <MaintenanceOverlay
        message={import.meta.env.VITE_MAINTENANCE_MESSAGE as string | undefined}
      />
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <LoginSheetProvider>
              <LibreSakayBadgeProvider>
                <CityPopulationBadgeProvider>
                  <RouterProvider router={router} />
                  <Toaster />
                </CityPopulationBadgeProvider>
              </LibreSakayBadgeProvider>
            </LoginSheetProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
