-- Migration: 12_seed_pages_v2
-- Seeds the pages table with all current admin route paths.
-- resource = path with '/admin/' prefix stripped, '/' → '-'
-- e-government submenu items get resource = 'e-government' (parent resource)
-- Libre-Sakay dynamic route (/admin/libre-sakay/:section) → resource = 'libre-sakay'

INSERT INTO "pages" ("id", "system", "path", "name", "resource") VALUES
  -- CORE: main admin pages
  ('pg-core-dashboard',              'core',               '/admin/dashboard',                        'Dashboard',                     'dashboard'),
  ('pg-core-registration-workflow',   'core',               '/admin/registration-workflow',             'Registration Requests',          'registration-workflow'),
  ('pg-core-citizens',               'core',               '/admin/citizens',                        'Citizens',                      'citizens'),
  ('pg-core-subscribers',            'core',               '/admin/subscribers',                     'Subscribers',                   'subscribers'),
  ('pg-core-e-government',           'core',               '/admin/e-government',                    'E-government',                  'e-government'),
  ('pg-core-e-government-reports',    'core',               '/admin/e-government/reports',             'Reports',                      'e-government'),
  ('pg-core-e-government-social',     'core',               '/admin/e-government/social-amelioration', 'Social Amelioration',          'e-government'),
  ('pg-core-e-government-gcash',      'core',               '/admin/e-government/gcash-reports',      'Gcash Reports',                 'e-government'),
  ('pg-core-e-government-payments',    'core',               '/admin/e-government/payments',            'Payments',                     'e-government'),
  ('pg-core-e-government-billings',   'core',               '/admin/e-government/billings',            'Billings',                     'e-government'),
  ('pg-core-e-government-misc',      'core',               '/admin/e-government/miscellaneous-fee',   'Miscellaneous Fee',            'e-government'),
  ('pg-core-e-government-qr',        'core',               '/admin/e-government/qr-scanner',         'QR Scanner',                   'e-government'),
  ('pg-core-e-bills-payment',        'core',               '/admin/e-bills-payment',                 'E-Bills Payment',               'e-bills-payment'),
  ('pg-core-e-services',             'core',               '/admin/e-services',                      'E-Services',                    'e-services'),
  ('pg-core-e-news',                 'core',               '/admin/e-news',                          'E-News',                       'e-news'),
  ('pg-core-e-news-articles',        'core',               '/admin/e-news/articles',                 'Articles',                      'e-news'),
  ('pg-core-e-wallet-services',      'core',               '/admin/e-wallet-services',               'E-Wallet Services',            'e-wallet-services'),
  ('pg-core-e-wallet-bills',         'core',               '/admin/e-wallet-services/bills',          'Bills',                        'e-wallet-services'),
  ('pg-core-e-wallet-cashin',        'core',               '/admin/e-wallet-services/cash-in',        'Cash-in',                      'e-wallet-services'),
  ('pg-core-e-wallet-cashxfer',      'core',               '/admin/e-wallet-services/cash-transfer',  'Cash Transfer',                'e-wallet-services'),
  ('pg-core-e-wallet-receive',       'core',               '/admin/e-wallet-services/receive-funds',  'Receive Funds',                'e-wallet-services'),
  ('pg-core-e-wallet-mobile',        'core',               '/admin/e-wallet-services/mobile-load',    'Mobile Load',                  'e-wallet-services'),
  ('pg-core-e-wallet-support',       'core',               '/admin/e-wallet-services/wallet-support',  'Wallet Support',               'e-wallet-services'),
  ('pg-core-e-help',                'core',               '/admin/e-help',                          'E-Help',                        'e-help'),
  ('pg-core-general-settings',        'core',               '/admin/general-settings',                'General Settings',              'general-settings'),
  ('pg-core-gs-address',            'core',               '/admin/general-settings/address',         'Address',                      'general-settings'),
  ('pg-core-gs-appointment',         'core',               '/admin/general-settings/appointment',      'Appointment',                   'general-settings'),
  ('pg-core-gs-billing-imports',   'core',               '/admin/general-settings/billing-imports',  'Billing Imports',               'general-settings'),
  ('pg-core-gs-brgy-chairmen',      'core',               '/admin/general-settings/brgy-chairmen',    'Brgy. Chairmen',               'general-settings'),
  ('pg-core-gs-cms',                'core',               '/admin/general-settings/cms',             'CMS',                          'general-settings'),
  ('pg-core-gs-business-ests',      'core',               '/admin/general-settings/business-ests',   'Business Ests.',               'general-settings'),
  ('pg-core-gs-calendar',           'core',               '/admin/general-settings/calendar-entries', 'Calendar Entries',            'general-settings'),
  ('pg-core-gs-citizenship',        'core',               '/admin/general-settings/citizenship',    'Citizenship',                   'general-settings'),
  ('pg-core-gs-e-wallet-svc',       'core',               '/admin/general-settings/e-wallet-services','E-Wallet Services',            'general-settings'),
  ('pg-core-gs-faq',               'core',               '/admin/general-settings/faq',             'Frequently Asked Questions',    'general-settings'),
  ('pg-core-gs-hospitals',          'core',               '/admin/general-settings/hospitals',        'Hospitals',                    'general-settings'),
  ('pg-core-gs-howto',              'core',               '/admin/general-settings/how-to',           'How To',                       'general-settings'),
  ('pg-core-gs-institution',         'core',               '/admin/general-settings/institution',      'Institution',                  'general-settings'),
  ('pg-core-gs-requirements',        'core',               '/admin/general-settings/requirements',    'Requirements',                 'general-settings'),
  ('pg-core-gs-smart-city',         'core',               '/admin/general-settings/smart-city-services','Smart City Services',       'general-settings'),
  ('pg-core-gs-system-modules',     'core',               '/admin/general-settings/system-modules',  'System Modules',               'general-settings'),
  ('pg-core-gs-opt-modules',        'core',               '/admin/general-settings/opt-modules',     'OPT Modules',                  'general-settings'),
  ('pg-core-gs-gov-program',        'core',               '/admin/general-settings/government-program','Government Program',         'general-settings'),
  ('pg-core-gs-tax-profiles',       'core',               '/admin/general-settings/tax-profiles',    'Tax Profiles',                 'general-settings'),
  ('pg-core-access-control',         'core',               '/admin/access-control',                   'Access Control',               'access-control'),
  ('pg-core-ac-role-mgmt',          'core',               '/admin/access-control/role-management',   'Role Management',              'access-control'),
  ('pg-core-ac-permissions',         'core',               '/admin/access-control/permissions',       'Permissions',                  'access-control'),
  ('pg-core-ac-user-mgmt',         'core',               '/admin/access-control/user-management',   'User Management',              'access-control'),
  ('pg-core-ac-page-mgmt',         'core',               '/admin/access-control/page-management',   'Page Management',              'access-control'),
  ('pg-core-city-announcement',      'core',               '/admin/city-announcement',                'City Announcement',             'city-announcement'),

  -- LIBRE-SAKAY (dynamic /admin/libre-sakay/:section)
  ('pg-ls-libre-sakay',             'libre-sakay',        '/admin/libre-sakay',                     'Libre Sakay',                  'libre-sakay'),

  -- LIBRE-MEDISINA (dynamic /admin/libre-medisina)
  ('pg-lm-libre-medisina',          'libre-medisina',     '/admin/libre-medisina',                  'Libre Medisina',                'libre-medisina'),

  -- SMART-CITY-SERVICES submenu items
  ('pg-sc-smart-city',              'smart-city-services', '/admin/smart-city-services',              'Smart City Services',           'smart-city-services'),
  ('pg-sc-gov-program',             'smart-city-services', '/admin/government-program',               'Government Programs',           'government-program'),

  -- E-GOVERNMENT-DYNAMIC (service pages via :serviceCode param)
  ('pg-eg-dynamic',                 'core',               '/admin/e-government/:serviceCode',          'Service Page',                  'e-government')

ON CONFLICT ("system", "path") DO NOTHING;
