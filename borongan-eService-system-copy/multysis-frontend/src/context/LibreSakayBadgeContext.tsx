import React, { createContext, useContext, useState, useEffect } from 'react';
import { portalProgramsService } from '@/services/api/portal-programs.service';

export type LibreSakayBadgeMap = Map<string, number>;

interface LibreSakayBadgeContextValue {
  badgeOverrides: LibreSakayBadgeMap;
  setBadgeOverrides: (badges: LibreSakayBadgeMap) => void;
  isBadgeLoading: boolean;
}

const LibreSakayBadgeContext = createContext<LibreSakayBadgeContextValue | null>(null);

export const LibreSakayBadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [badgeOverrides, setBadgeOverridesState] = useState<LibreSakayBadgeMap>(new Map());
  const [isBadgeLoading, setIsBadgeLoading] = useState(true);

  // Eagerly fetch badge count on mount so sidebar badge is available for all users immediately
  useEffect(() => {
    let cancelled = false;
    setIsBadgeLoading(true);

    portalProgramsService
      .listApplicationsAdmin({
        status: 'pending',
        programId: 'gp-all-libre-sakay',
        limit: 1,
      })
      .then(data => {
        if (cancelled) return;
        const count = data?.pagination?.total ?? 0;
        setBadgeOverridesState(new Map([['/admin/libre-sakay/applications', count]]));
      })
      .catch(() => {
        // silently ignore — badge just won't show
      })
      .finally(() => {
        if (!cancelled) setIsBadgeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setBadgeOverrides = (badges: LibreSakayBadgeMap) => {
    setBadgeOverridesState(badges);
  };

  return (
    <LibreSakayBadgeContext.Provider value={{ badgeOverrides, setBadgeOverrides, isBadgeLoading }}>
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
