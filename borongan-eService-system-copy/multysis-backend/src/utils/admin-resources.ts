export interface ResourceOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Get admin resources for permissions
 * This should match the admin menu structure
 */
export const getAdminResources = (): ResourceOption[] => {
  const resources: ResourceOption[] = [
    { value: 'dashboard', label: 'Dashboard', description: 'Main dashboard access' },
    { value: 'residents', label: 'Residents', description: 'Resident management' },
    { value: 'e-government', label: 'E-government', description: 'E-government main section' },
    {
      value: 'e-government-rpt',
      label: 'E-government - RPT',
      description: 'Real Property Tax management',
    },
    {
      value: 'e-government-bpls',
      label: 'E-government - BPLS',
      description: 'Business Permit & Licensing System',
    },
    {
      value: 'e-government-cedula',
      label: 'E-government - Cedula',
      description: 'Cedula management',
    },
    {
      value: 'e-government-civil-registry',
      label: 'E-government - Civil Registry',
      description: 'Civil Registry management',
    },
    {
      value: 'e-government-occupational-health',
      label: 'E-government - Occupational & Health',
      description: 'Occupational Health management',
    },
    {
      value: 'e-government-health-certificate',
      label: 'E-government - Health Certificate',
      description: 'Health Certificate management',
    },
    {
      value: 'e-government-occupational-permit',
      label: 'E-government - Occupational Permit',
      description: 'Occupational Permit management',
    },
    {
      value: 'e-government-police-clearance',
      label: 'E-government - Police Clearance',
      description: 'Police Clearance management',
    },
    {
      value: 'e-government-business-tax',
      label: 'E-government - Business Tax',
      description: 'Business Tax management',
    },
    {
      value: 'e-government-ordinance-violations',
      label: 'E-government - Ordinance Violations',
      description: 'Ordinance Violations management',
    },
    {
      value: 'e-government-special-permit',
      label: 'E-government - Special Permit',
      description: 'Special Permit management',
    },
    {
      value: 'e-government-notice-violations',
      label: 'E-government - Notice if Violations',
      description: 'Notice of Violations management',
    },
    {
      value: 'e-government-delivery-transactions',
      label: 'E-government - Delivery Transactions',
      description: 'Delivery Transactions management',
    },
    {
      value: 'e-government-social-amelioration',
      label: 'E-government - Social Amelioration',
      description: 'Social Amelioration management',
    },
    {
      value: 'e-government-reports',
      label: 'E-government - Reports',
      description: 'Reports access',
    },
    {
      value: 'e-government-gcash-reports',
      label: 'E-government - Gcash Reports',
      description: 'Gcash Reports access',
    },
    {
      value: 'e-government-payments',
      label: 'E-government - Payments',
      description: 'Payments management',
    },
    {
      value: 'e-government-billings',
      label: 'E-government - Billings',
      description: 'Billings management',
    },
    {
      value: 'e-government-miscellaneous-fee',
      label: 'E-government - Miscellaneous Fee',
      description: 'Miscellaneous Fee management',
    },
    {
      value: 'e-government-qr-scanner',
      label: 'E-government - QR Scanner',
      description: 'QR Scanner access',
    },
    {
      value: 'e-bills-payment',
      label: 'E-Bills Payment',
      description: 'E-Bills Payment management',
    },
    { value: 'e-services', label: 'E-Services', description: 'E-Services management' },
    { value: 'e-news', label: 'E-News', description: 'E-News main section' },
    {
      value: 'e-news-articles',
      label: 'E-News - Articles',
      description: 'E-News Articles management',
    },
    {
      value: 'e-wallet-services',
      label: 'E-Wallet Services',
      description: 'E-Wallet Services main section',
    },
    {
      value: 'e-wallet-services-bills',
      label: 'E-Wallet Services - Bills',
      description: 'E-Wallet Bills management',
    },
    {
      value: 'e-wallet-services-cash-in',
      label: 'E-Wallet Services - Cash-in',
      description: 'E-Wallet Cash-in management',
    },
    {
      value: 'e-wallet-services-cash-transfer',
      label: 'E-Wallet Services - Cash Transfer',
      description: 'E-Wallet Cash Transfer management',
    },
    {
      value: 'e-wallet-services-receive-funds',
      label: 'E-Wallet Services - Receive Funds',
      description: 'E-Wallet Receive Funds management',
    },
    {
      value: 'e-wallet-services-mobile-load',
      label: 'E-Wallet Services - Mobile Load',
      description: 'E-Wallet Mobile Load management',
    },
    {
      value: 'e-wallet-services-wallet-support',
      label: 'E-Wallet Services - Wallet Support',
      description: 'E-Wallet Support management',
    },
    { value: 'e-help', label: 'E-Help', description: 'E-Help management' },
    {
      value: 'general-settings',
      label: 'General Settings',
      description: 'General Settings main section',
    },
    {
      value: 'city-announcement',
      label: 'City Announcement',
      description: 'City Announcement management',
    },
    { value: 'notifications', label: 'Notifications', description: 'Notifications management' },
    {
      value: 'access-control',
      label: 'Access Control',
      description: 'Access Control main section',
    },
    {
      value: 'access-control-role-management',
      label: 'Access Control - Role Management',
      description: 'Role Management',
    },
    {
      value: 'access-control-permissions',
      label: 'Access Control - Permissions',
      description: 'Permissions Management',
    },
    {
      value: 'access-control-user-management',
      label: 'Access Control - User Management',
      description: 'User Management',
    },
  ];

  return resources.sort((a, b) => a.label.localeCompare(b.label));
};
