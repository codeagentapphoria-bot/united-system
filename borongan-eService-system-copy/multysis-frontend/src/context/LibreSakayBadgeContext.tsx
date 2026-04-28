import React, { createContext, useContext, useState } from 'react';

export type LibreSakayBadgeMap = Map<string, number>;

interface LibreSakayBadgeContextValue {
  badgeOverrides: LibreSakayBadgeMap;
  setBadgeOverrides: (badges: LibreSakayBadgeMap) => void;
}

const LibreSakayBadgeContext = createContext<LibreSakayBadgeContextValue | null>(null);

export const LibreSakayBadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [badgeOverrides, setBadgeOverridesState] = useState<LibreSakayBadgeMap>(new Map());

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
