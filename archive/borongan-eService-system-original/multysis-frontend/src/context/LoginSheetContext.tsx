// React imports
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

interface LoginSheetContextType {
  isLoginOpen: boolean;
  isSignupOpen: boolean;
  openLoginSheet: () => void;
  closeLoginSheet: () => void;
  setLoginSheetOpen: (open: boolean) => void;
  openSignupSheet: () => void;
  closeSignupSheet: () => void;
  setSignupSheetOpen: (open: boolean) => void;
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
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  const openLoginSheet = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };
  const closeLoginSheet = () => setIsLoginOpen(false);
  const setLoginSheetOpen = (open: boolean) => setIsLoginOpen(open);

  const openSignupSheet = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };
  const closeSignupSheet = () => setIsSignupOpen(false);
  const setSignupSheetOpen = (open: boolean) => setIsSignupOpen(open);

  return (
    <LoginSheetContext.Provider
      value={{
        isLoginOpen,
        isSignupOpen,
        openLoginSheet,
        closeLoginSheet,
        setLoginSheetOpen,
        openSignupSheet,
        closeSignupSheet,
        setSignupSheetOpen,
      }}
    >
      {children}
    </LoginSheetContext.Provider>
  );
};

