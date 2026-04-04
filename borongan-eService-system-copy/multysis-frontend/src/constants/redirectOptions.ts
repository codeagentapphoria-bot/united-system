export interface RedirectOption {
  value: string;
  label: string;
  description: string;
}

export const redirectOptions: RedirectOption[] = [
  {
    value: 'Admin Dashboard',
    label: 'Admin Dashboard',
    description: 'Main administrative overview and controls'
  },
  {
    value: 'Subscribers Management',
    label: 'Subscribers Management',
    description: 'Manage user accounts and subscriptions'
  },
  {
    value: 'Citizens Management',
    label: 'Citizens Management',
    description: 'Manage citizen records and information'
  },
  {
    value: 'Reports Dashboard',
    label: 'Reports Dashboard',
    description: 'View analytics, reports, and statistics'
  },
  {
    value: 'E-News Articles',
    label: 'E-News Articles',
    description: 'Manage news articles and content'
  },
  {
    value: 'Payment Management',
    label: 'Payment Management',
    description: 'Handle financial transactions and payments'
  },
  {
    value: 'Social Amelioration',
    label: 'Social Amelioration',
    description: 'Manage social welfare programs'
  },
  {
    value: 'E-Government Services',
    label: 'E-Government Services',
    description: 'Government services and applications'
  },
  {
    value: 'User Portal',
    label: 'User Portal',
    description: 'Public user interface and services'
  },
  {
    value: 'Settings',
    label: 'Settings',
    description: 'System configuration and preferences'
  }
];



