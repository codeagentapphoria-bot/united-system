// React imports
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

interface LoginSheetContextType {
  isLoginOpen: boolean;
  openLoginSheet: () => void;
  closeLoginSheet: () => void;
  setLoginSheetOpen: (open: boolean) => void;
}

const LoginSheetContext = createContext<LoginSheetContextType | undefined>(undefined);

export const useLoginSheet = () => {
  const context = useContext(LoginSheetContext);
  if (!context) {
    throw new Error('useLoginSheet must be used within LoginSheetProvider');
  }
  return context;
};

interface LoginSheetProviderProps {
  children: ReactNode;
}

export const LoginSheetProvider: React.FC<LoginSheetProviderProps> = ({ children }) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const openLoginSheet = () => setIsLoginOpen(true);
  const closeLoginSheet = () => setIsLoginOpen(false);
  const setLoginSheetOpen = (open: boolean) => setIsLoginOpen(open);

  return (
    <LoginSheetContext.Provider
      value={{
        isLoginOpen,
        openLoginSheet,
        closeLoginSheet,
        setLoginSheetOpen,
      }}
    >
      {children}
    </LoginSheetContext.Provider>
  );
};