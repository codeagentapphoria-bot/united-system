import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAdminNotifications } from '@/hooks/notifications/useAdminNotifications';

export type CityPopulationBadgeMap = Map<string, number>;

interface CityPopulationBadgeContextValue {
  badgeOverrides: CityPopulationBadgeMap;
  setBadgeOverrides: (badges: CityPopulationBadgeMap) => void;
  isBadgeLoading: boolean;
}

const CityPopulationBadgeContext = createContext<CityPopulationBadgeContextValue | null>(null);

export const CityPopulationBadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [badgeOverrides, setBadgeOverridesState] = useState<CityPopulationBadgeMap>(new Map());
  const [isBadgeLoading, setIsBadgeLoading] = useState(true);
  const { counts } = useAdminNotifications();
  const pendingCitizens = counts.pendingCitizens;

  // Eagerly fetch badge count on mount so sidebar badge is available for all users immediately
  useEffect(() => {
    let cancelled = false;
    setIsBadgeLoading(true);

    if (cancelled) return;

    // Use the same pendingCitizens signal from useAdminNotifications — no new API needed
    // The hook polls every 30 s, so the badge count stays fresh automatically
    const count = pendingCitizens;
    if (count !== undefined && count > 0) {
      setBadgeOverridesState(new Map([['/admin/city-population/registrations', count]]));
    }

    if (!cancelled) setIsBadgeLoading(false);

    return () => {
      cancelled = true;
    };
  }, [pendingCitizens]);

  const setBadgeOverrides = (badges: CityPopulationBadgeMap) => {
    setBadgeOverridesState(badges);
  };

  return (
    <CityPopulationBadgeContext.Provider value={{ badgeOverrides, setBadgeOverrides, isBadgeLoading }}>
      {children}
    </CityPopulationBadgeContext.Provider>
  );
};

export function useCityPopulationBadgeOverrides(): CityPopulationBadgeContextValue {
  const ctx = useContext(CityPopulationBadgeContext);
  if (!ctx) {
    throw new Error('useCityPopulationBadgeOverrides must be used within CityPopulationBadgeProvider');
  }
  return ctx;
}
