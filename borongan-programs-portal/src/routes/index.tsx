import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const Home = React.lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const Login = React.lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })));
const Register = React.lazy(() => import('@/pages/Register').then((m) => ({ default: m.Register })));
const LibreSakay = React.lazy(() => import('@/pages/LibreSakay').then((m) => ({ default: m.LibreSakay })));
const ProgramDetail = React.lazy(() => import('@/pages/ProgramDetail').then((m) => ({ default: m.ProgramDetail })));

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
  </div>
);

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<Spinner />}>{element}</Suspense>;
}

// Redirects unauthenticated users to /login, preserving the intended path
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

// Redirects already-logged-in users away from auth pages
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute>{withSuspense(<Home />)}</ProtectedRoute>,
  },
  {
    path: '/login',
    element: <GuestRoute>{withSuspense(<Login />)}</GuestRoute>,
  },
  {
    path: '/register',
    element: <GuestRoute>{withSuspense(<Register />)}</GuestRoute>,
  },
  {
    path: '/libre-sakay',
    element: <ProtectedRoute>{withSuspense(<LibreSakay />)}</ProtectedRoute>,
  },
  {
    path: '/programs/:id',
    element: <ProtectedRoute>{withSuspense(<ProgramDetail />)}</ProtectedRoute>,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
