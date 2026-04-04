import { Toaster } from '@/components/ui/toaster';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginSheetProvider } from './context/LoginSheetContext';
import { SocketProvider } from './context/SocketContext';
import { router } from './routes';

interface AppProps {}

export const App: React.FC<AppProps> = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <LoginSheetProvider>
          <RouterProvider router={router} />
          <Toaster />
        </LoginSheetProvider>
      </SocketProvider>
    </AuthProvider>
  );
};
