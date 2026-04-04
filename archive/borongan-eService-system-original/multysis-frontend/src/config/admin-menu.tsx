import { buildEGovernmentSubmenu } from '@/utils/dynamic-menu';
import {
  FiCreditCard,
  FiFileText,
  FiHelpCircle,
  FiHome,
  FiMessageSquare,
  FiSettings,
  FiShield,
  FiTool,
  FiUsers,
  FiClipboard
} from 'react-icons/fi';
import { SlWallet } from "react-icons/sl";


interface MenuItem {
  path?: string;
  label?: string;
  icon?: React.ReactNode;
  type?: 'separator';
  hasSubmenu?: boolean;
  submenuItems?: { path: string; label: string; badgeCount?: number }[];
  badgeCount?: number;
}

interface NotificationCounts {
  pendingApplications: number;
  pendingCitizens: number;
  pendingUpdateRequests: number;
  unreadMessages: number;
  total: number;
  pendingApplicationsByService?: Record<string, number>; // service code -> count
}

export const getAdminMenuItems = async (notificationCounts?: NotificationCounts): Promise<MenuItem[]> => {
  // Get dynamic services for e-government submenu
  let dynamicSubmenuItems: { path: string; label: string; badgeCount?: number }[] = [];
  
  try {
    const { getDynamicServices } = await import('@/utils/dynamic-menu');
    const dynamicServices = await getDynamicServices();
    const baseSubmenuItems = buildEGovernmentSubmenu(dynamicServices);
    
    // Add badge counts to submenu items based on service code
    dynamicSubmenuItems = baseSubmenuItems.map(item => {
      // Extract service path from item path (e.g., /admin/e-government/birth-certificate -> birth-certificate)
      const pathParts = item.path.split('/');
      const servicePath = pathParts[pathParts.length - 1];
      
      // Find matching service by comparing normalized paths
      const matchingService = dynamicServices.find(s => {
        const normalizedCode = s.code.toLowerCase().replace(/_/g, '-');
        return normalizedCode === servicePath;
      });
      
      // Get badge count using the actual service code from the database
      const badgeCount = matchingService 
        ? (notificationCounts?.pendingApplicationsByService?.[matchingService.code] || 0)
        : 0;
      
      return {
        ...item,
        badgeCount: badgeCount > 0 ? badgeCount : undefined,
      };
    });
  } catch (error) {
    console.error('Failed to load dynamic services for menu:', error);
    // Continue with empty dynamic submenu items
  }

  return [
    { path: '/admin/dashboard', label: 'Dashboard', icon: <FiHome /> },
    { path: '/admin/subscribers', label: 'Subscribers', icon: <FiUsers /> },
    
    // Separator: Citizen top
    { type: 'separator' as const },
    
    { 
      path: '/admin/citizens', 
      label: 'Citizens', 
      icon: <FiUsers />,
    },
    { 
      path: '/admin/registration-workflow', 
      label: 'Registration Workflow', 
      icon: <FiClipboard />,
      badgeCount: notificationCounts?.pendingCitizens || 0,
    },
    
    // Separator: Citizen bottom
    { type: 'separator' as const },
    
    { 
      path: '/admin/e-government', 
      label: 'E-government', 
      icon: <FiFileText />, 
      hasSubmenu: true,
      badgeCount: notificationCounts?.pendingApplications || 0,
      submenuItems: [
        ...dynamicSubmenuItems,
        // Static items that are not services
        { path: '/admin/e-government/reports', label: 'Reports' },
        { path: '/admin/e-government/social-amelioration', label: 'Social Amelioration' },
        { path: '/admin/e-government/gcash-reports', label: 'Gcash Reports' },
        { path: '/admin/e-government/payments', label: 'Payments' },
        { path: '/admin/e-government/billings', label: 'Billings' },
        { path: '/admin/e-government/miscellaneous-fee', label: 'Miscellaneous Fee' },
        { path: '/admin/e-government/qr-scanner', label: 'QR Scanner' },
      ]
    },
  { path: '/admin/e-bills-payment', label: 'E-Bills Payment', icon: <FiCreditCard /> },
  { path: '/admin/e-services', label: 'E-Services', icon: <FiTool /> },
  { 
    path: '/admin/e-news', 
    label: 'E-News', 
    icon: <FiMessageSquare />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/e-news/articles', label: 'Articles' },
    ]
  },
  { 
    path: '/admin/e-wallet-services', 
    label: 'E-Wallet Services', 
    icon: <SlWallet  className="text-primary-600" size={14} />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/e-wallet-services/bills', label: 'Bills' },
      { path: '/admin/e-wallet-services/cash-in', label: 'Cash-in' },
      { path: '/admin/e-wallet-services/cash-transfer', label: 'Cash Transfer' },
      { path: '/admin/e-wallet-services/receive-funds', label: 'Receive Funds' },
      { path: '/admin/e-wallet-services/mobile-load', label: 'Mobile Load' },
      { path: '/admin/e-wallet-services/wallet-support', label: 'Wallet Support' },
    ]
  },
  { path: '/admin/e-help', label: 'E-Help', icon: <FiHelpCircle /> },
  
  // Separator: Below e-help
  { type: 'separator' as const },
  
  { 
    path: '/admin/general-settings', 
    label: 'General Settings', 
    icon: <FiSettings />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/general-settings/address', label: 'Address' },
      { path: '/admin/general-settings/appointment', label: 'Appointment' },
      { path: '/admin/general-settings/billing-imports', label: 'Billing Imports' },
      { path: '/admin/general-settings/brgy-chairmen', label: 'Brgy. Chairmen' },
      { path: '/admin/general-settings/cms', label: 'CMS' },
      { path: '/admin/general-settings/business-ests', label: 'Business Ests.' },
      { path: '/admin/general-settings/calendar-entries', label: 'Calendar Entries' },
      { path: '/admin/general-settings/citizenship', label: 'Citizenship' },
      { path: '/admin/general-settings/e-wallet-services', label: 'E-Wallet Services' },
      { path: '/admin/general-settings/faq', label: 'Frequently Asked Questions' },
      { path: '/admin/general-settings/hospitals', label: 'Hospitals' },
      { path: '/admin/general-settings/how-to', label: 'How To' },
      { path: '/admin/general-settings/institution', label: 'Institution' },
      { path: '/admin/general-settings/requirements', label: 'Requirements' },
      { path: '/admin/general-settings/smart-city-services', label: 'Smart City Services' },
      { path: '/admin/general-settings/system-modules', label: 'System Modules' },
      { path: '/admin/general-settings/opt-modules', label: 'OPT Modules' },
      { path: '/admin/general-settings/government-program', label: 'Government Program' },
      { path: '/admin/general-settings/tax-profiles', label: 'Tax Profiles' },
    ]
  },
  { 
    path: '/admin/access-control', 
    label: 'Access Control', 
    icon: <FiShield />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/access-control/role-management', label: 'Role Management' },
      { path: '/admin/access-control/permissions', label: 'Permissions' },
      { path: '/admin/access-control/user-management', label: 'User Management' },
    ]
  },
  
  // Separator: Below access control
  { type: 'separator' as const },
  
  { path: '/admin/city-announcement', label: 'City Announcement', icon: <FiMessageSquare /> },
  ];
};

// Default export for backward compatibility (will use empty submenu initially)
export const adminMenuItems: MenuItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <FiHome /> },
  { path: '/admin/subscribers', label: 'Subscribers', icon: <FiUsers /> },
  { type: 'separator' as const },
  { path: '/admin/citizens', label: 'Citizens', icon: <FiUsers /> },
  { path: '/admin/registration-workflow', label: 'Registration Workflow', icon: <FiClipboard /> },
  { type: 'separator' as const },
  { 
    path: '/admin/e-government', 
    label: 'E-government', 
    icon: <FiFileText />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/e-government/reports', label: 'Reports' },
      { path: '/admin/e-government/social-amelioration', label: 'Social Amelioration' },
      { path: '/admin/e-government/gcash-reports', label: 'Gcash Reports' },
      { path: '/admin/e-government/payments', label: 'Payments' },
      { path: '/admin/e-government/billings', label: 'Billings' },
      { path: '/admin/e-government/miscellaneous-fee', label: 'Miscellaneous Fee' },
      { path: '/admin/e-government/qr-scanner', label: 'QR Scanner' },
    ]
  },
  { path: '/admin/e-bills-payment', label: 'E-Bills Payment', icon: <FiCreditCard /> },
  { path: '/admin/e-services', label: 'E-Services', icon: <FiTool /> },
  { 
    path: '/admin/e-news', 
    label: 'E-News', 
    icon: <FiMessageSquare />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/e-news/articles', label: 'Articles' },
    ]
  },
  { 
    path: '/admin/e-wallet-services', 
    label: 'E-Wallet Services', 
    icon: <SlWallet className="text-primary-600" size={14} />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/e-wallet-services/bills', label: 'Bills' },
      { path: '/admin/e-wallet-services/cash-in', label: 'Cash-in' },
      { path: '/admin/e-wallet-services/cash-transfer', label: 'Cash Transfer' },
      { path: '/admin/e-wallet-services/receive-funds', label: 'Receive Funds' },
      { path: '/admin/e-wallet-services/mobile-load', label: 'Mobile Load' },
      { path: '/admin/e-wallet-services/wallet-support', label: 'Wallet Support' },
    ]
  },
  { path: '/admin/e-help', label: 'E-Help', icon: <FiHelpCircle /> },
  { type: 'separator' as const },
  { 
    path: '/admin/general-settings', 
    label: 'General Settings', 
    icon: <FiSettings />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/general-settings/address', label: 'Address' },
      { path: '/admin/general-settings/appointment', label: 'Appointment' },
      { path: '/admin/general-settings/billing-imports', label: 'Billing Imports' },
      { path: '/admin/general-settings/brgy-chairmen', label: 'Brgy. Chairmen' },
      { path: '/admin/general-settings/cms', label: 'CMS' },
      { path: '/admin/general-settings/business-ests', label: 'Business Ests.' },
      { path: '/admin/general-settings/calendar-entries', label: 'Calendar Entries' },
      { path: '/admin/general-settings/citizenship', label: 'Citizenship' },
      { path: '/admin/general-settings/e-wallet-services', label: 'E-Wallet Services' },
      { path: '/admin/general-settings/faq', label: 'Frequently Asked Questions' },
      { path: '/admin/general-settings/hospitals', label: 'Hospitals' },
      { path: '/admin/general-settings/how-to', label: 'How To' },
      { path: '/admin/general-settings/institution', label: 'Institution' },
      { path: '/admin/general-settings/requirements', label: 'Requirements' },
      { path: '/admin/general-settings/smart-city-services', label: 'Smart City Services' },
      { path: '/admin/general-settings/system-modules', label: 'System Modules' },
      { path: '/admin/general-settings/opt-modules', label: 'OPT Modules' },
      { path: '/admin/general-settings/government-program', label: 'Government Program' },
      { path: '/admin/general-settings/tax-profiles', label: 'Tax Profiles' },
    ]
  },
  { 
    path: '/admin/access-control', 
    label: 'Access Control', 
    icon: <FiShield />, 
    hasSubmenu: true,
    submenuItems: [
      { path: '/admin/access-control/role-management', label: 'Role Management' },
      { path: '/admin/access-control/permissions', label: 'Permissions' },
      { path: '/admin/access-control/user-management', label: 'User Management' },
    ]
  },
  { type: 'separator' as const },
  { path: '/admin/city-announcement', label: 'City Announcement', icon: <FiMessageSquare /> },
];
