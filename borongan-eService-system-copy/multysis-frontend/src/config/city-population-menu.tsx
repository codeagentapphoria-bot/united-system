import React from 'react';
import { FiHome, FiUserCheck, FiUsers } from 'react-icons/fi';

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

export const cityPopulationMenuItems: MenuItem[] = [
  { path: '/admin/city-population/dashboard', label: 'Dashboard', icon: <FiHome />, system: 'city-population' },
  { path: '/admin/city-population/registrations', label: 'Registrations', icon: <FiUserCheck />, system: 'city-population' },
  { path: '/admin/city-population/residents', label: 'Residents', icon: <FiUsers />, system: 'city-population' },
];
