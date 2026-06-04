import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAdminNotifications } from '@/hooks/notifications/useAdminNotifications';

export type LibreSakayBadgeMap = Map<string, number>;

interface LibreSakayBadgeContextValue {
  badgeOverrides: LibreSakayBadgeMap;
  setBadgeOverrides: (badges: LibreSakayBadgeMap) => void;
}

const LibreSakayBadgeContext = createContext<LibreSakayBadgeContextValue | null>(null);

export const LibreSakayBadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [badgeOverrides, setBadgeOverridesState] = useState<LibreSakayBadgeMap>(new Map());
  const { counts } = useAdminNotifications();
  const pendingProgramApplications = counts.pendingProgramApplications;

  // Subscribe to pendingProgramApplications from global notification state (real-time via WebSocket)
  // No eager fetch needed — updates come through WebSocket events filtered to gp-all-libre-sakay
  useEffect(() => {
    const count = pendingProgramApplications;
    if (count > 0) {
      setBadgeOverridesState(new Map([['/admin/libre-sakay/applications', count]]));
    } else {
      // Clear badge when count reaches zero
      setBadgeOverridesState(new Map());
    }
  }, [pendingProgramApplications]);

  const setBadgeOverrides = (badges: LibreSakayBadgeMap) => {
    setBadgeOverridesState(badges);
  };

  return (
    <LibreSakayBadgeContext.Provider value={{ badgeOverrides, setBadgeOverrides }}>
      {children}
    </LibreSakayBadgeContext.Provider>
  );
};

export function useLibreSakayBadgeOverrides(): LibreSakayBadgeContextValue {
  const ctx = useContext(LibreSakayBadgeContext);
  if (!ctx) {
    throw new Error('useLibreSakayBadgeOverrides must be used within LibreSakayBadgeProvider');
  }
  return ctx;
}
