import { createContext, useContext, type ReactNode } from 'react';

interface AllowedPagesContextValue {
  allowedPaths: Set<string>;
  isLoading: boolean;
}

export const AllowedPagesContext = createContext<AllowedPagesContextValue>({
  allowedPaths: new Set(),
  isLoading: true,
});

export const useAllowedPages = () => useContext(AllowedPagesContext);

interface AllowedPagesProviderProps {
  children: ReactNode;
  allowedPaths: Set<string>;
  isLoading: boolean;
}

export const AllowedPagesProvider: React.FC<AllowedPagesProviderProps> = ({
  children,
  allowedPaths,
  isLoading,
}) => {
  return (
    <AllowedPagesContext.Provider value={{ allowedPaths, isLoading }}>
      {children}
    </AllowedPagesContext.Provider>
  );
};
