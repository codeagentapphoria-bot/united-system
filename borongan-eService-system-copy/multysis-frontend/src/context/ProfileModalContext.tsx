import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ProfileModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const ProfileModalContext = createContext<ProfileModalContextValue | undefined>(undefined);

export const useProfileModal = (): ProfileModalContextValue => {
  const context = useContext(ProfileModalContext);
  if (!context) {
    throw new Error('useProfileModal must be used within a ProfileModalProvider');
  }
  return context;
};

interface ProfileModalProviderProps {
  children: ReactNode;
}

export const ProfileModalProvider: React.FC<ProfileModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <ProfileModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </ProfileModalContext.Provider>
  );
};
