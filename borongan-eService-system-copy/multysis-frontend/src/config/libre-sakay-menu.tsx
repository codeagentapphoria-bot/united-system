import React from 'react';
import { FiHome, FiMap, FiTruck, FiGitBranch, FiUsers, FiMapPin, FiList, FiUserCheck, FiSearch, FiSettings } from 'react-icons/fi';

interface MenuItem {
  path?: string;
  label?: string;
  icon?: React.ReactNode;
  type?: 'separator';
  hasSubmenu?: boolean;
  submenuItems?: { path: string; label: string; category?: string }[];
  badgeCount?: number;
  system?: string;
}

export const libresakayMenuItems: MenuItem[] = [
  { path: '/admin/libre-sakay/dashboard', label: 'Dashboard', icon: <FiHome />, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/verification', label: 'Verify Resident', icon: <FiSearch />, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/applications', label: 'Program Applications', icon: <FiUserCheck />, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/fleet', label: 'Fleet', icon: <FiMap />, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/buses', label: 'Buses', icon: <FiTruck />, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/routes', label: 'Routes', icon: <FiGitBranch />, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/drivers', label: 'Drivers', icon: <FiUsers />, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/stops', label: 'Stops', icon: <FiMapPin />, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/ride-logs', label: 'Ride Logs', icon: <FiList />, system: 'libre-sakay' },
  { type: 'separator' as const, system: 'libre-sakay' },
  { path: '/admin/libre-sakay/settings', label: 'Program Settings', icon: <FiSettings />, system: 'libre-sakay' },
  // { path: '/admin/libre-sakay/access-control', label: 'Access Control', icon: <FiShield /> },
];
