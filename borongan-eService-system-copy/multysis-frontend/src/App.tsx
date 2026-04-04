import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginSheetProvider } from './context/LoginSheetContext';
import { SocketProvider } from './context/SocketContext';
import { router } from './routes';
import { queryClient } from './lib/query-client';

interface AppProps {}

export const App: React.FC<AppProps> = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <LoginSheetProvider>
            <RouterProvider router={router} />
            <Toaster />
          </LoginSheetProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
