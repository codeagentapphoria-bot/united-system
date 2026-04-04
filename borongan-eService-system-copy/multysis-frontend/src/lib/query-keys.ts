export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },

  residents: {
    all: ['residents'] as const,
    list: (filters: Record<string, unknown>) => ['residents', 'list', filters] as const,
    detail: (id: string) => ['residents', 'detail', id] as const,
    search: (search: string, options?: Record<string, unknown>) =>
      ['residents', 'search', search, options] as const,
  },

  services: {
    all: ['services'] as const,
    list: (page: number, filters?: Record<string, unknown>) =>
      ['services', 'list', page, filters] as const,
    detail: (id: string) => ['services', 'detail', id] as const,
    categories: ['services', 'categories'] as const,
  },

  users: {
    all: ['users'] as const,
    list: (page: number, limit?: number) => ['users', 'list', page, limit] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },

  roles: {
    all: ['roles'] as const,
    list: (page: number, limit?: number) => ['roles', 'list', page, limit] as const,
    detail: (id: string) => ['roles', 'detail', id] as const,
  },

  permissions: {
    all: ['permissions'] as const,
    list: (filters?: Record<string, unknown>) => ['permissions', 'list', filters] as const,
  },

  faqs: {
    all: ['faqs'] as const,
    list: (filters?: Record<string, unknown>) => ['faqs', 'list', filters] as const,
    detail: (id: string) => ['faqs', 'detail', id] as const,
  },

  dashboard: {
    statistics: ['dashboard', 'statistics'] as const,
  },

  transactions: {
    all: ['transactions'] as const,
    list: (filters: Record<string, unknown>) => ['transactions', 'list', filters] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
    resident: (residentId: string, filters?: Record<string, unknown>) =>
      ['transactions', 'resident', residentId, filters] as const,
  },

  profile: {
    me: ['profile', 'me'] as const,
    household: ['profile', 'household'] as const,
    classifications: ['profile', 'classifications'] as const,
  },

  addresses: {
    all: ['addresses'] as const,
    regions: ['addresses', 'regions'] as const,
    provinces: (regionCode?: string) => ['addresses', 'provinces', regionCode] as const,
    municipalities: (provCode?: string) => ['addresses', 'municipalities', provCode] as const,
    barangays: (munCode?: string) => ['addresses', 'barangays', munCode] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
    subscriber: ['notifications', 'subscriber'] as const,
    admin: ['notifications', 'admin'] as const,
  },
};

export default queryKeys;
