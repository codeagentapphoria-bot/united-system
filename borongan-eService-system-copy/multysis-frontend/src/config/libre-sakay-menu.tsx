import React from 'react';
import { FiHome, FiMap, FiTruck, FiGitBranch, FiUsers, FiMapPin, FiList, FiUserCheck } from 'react-icons/fi';

interface MenuItem {
  path?: string;
  label?: string;
  icon?: React.ReactNode;
  type?: 'separator';
  hasSubmenu?: boolean;
  submenuItems?: { path: string; label: string }[];
  badgeCount?: number;
}

export const libresakayMenuItems: MenuItem[] = [
  { path: '/admin/libre-sakay/dashboard', label: 'Dashboard', icon: <FiHome /> },
  { path: '/admin/libre-sakay/applications', label: 'Program Applications', icon: <FiUserCheck /> },
  { path: '/admin/libre-sakay/fleet', label: 'Fleet', icon: <FiMap /> },
  { path: '/admin/libre-sakay/buses', label: 'Buses', icon: <FiTruck /> },
  { path: '/admin/libre-sakay/routes', label: 'Routes', icon: <FiGitBranch /> },
  { path: '/admin/libre-sakay/drivers', label: 'Drivers', icon: <FiUsers /> },
  { path: '/admin/libre-sakay/stops', label: 'Stops', icon: <FiMapPin /> },
  { path: '/admin/libre-sakay/ride-logs', label: 'Ride Logs', icon: <FiList /> },
 // { type: 'separator' as const },
 // { path: '/admin/libre-sakay/access-control', label: 'Access Control', icon: <FiShield /> },
];
