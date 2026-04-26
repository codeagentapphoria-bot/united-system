// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { getAdminMenuItems, adminMenuItems as staticMenuItems } from '@/config/admin-menu';

// Hooks
import { useAdminNotifications } from '@/hooks/notifications/useAdminNotifications';
import { useAuth } from '@/context/AuthContext';

// Utils
import { cn } from '@/lib/utils';
import { clearServiceCache } from '@/utils/dynamic-menu';
import { userService } from '@/services/api/user.service';

// Custom Components
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AllowedPagesProvider } from '../../context/AllowedPagesContext';

interface SubmenuItem {
  path: string;
  label: string;
}

interface MenuItem {
  path?: string;
  label?: string;
  icon?: React.ReactNode;
  type?: 'separator';
  hasSubmenu?: boolean;
  submenuItems?: SubmenuItem[];
  badgeCount?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  menuItems?: MenuItem[]; // Optional, will use dynamic if not provided
}

/** Returns true if a menu item path (or one of its submenu paths) is in the allowed list. */
function isAllowed(path: string | undefined, allowedPaths: Set<string>): boolean {
  if (!path) return true; // separators are always shown
  return allowedPaths.has(path);
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, menuItems: propMenuItems }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(propMenuItems || staticMenuItems);
  const [allowedPaths, setAllowedPaths] = useState<Set<string>>(new Set());
  const [isAllowedPagesLoading, setIsAllowedPagesLoading] = useState(true);
  const { counts } = useAdminNotifications();
  const { user } = useAuth();

  // Fetch user's allowed page paths from backend
  useEffect(() => {
    if (!user?.id) return;

    setIsAllowedPagesLoading(true);
    userService
      .getAllowedPagePaths(user.id)
      .then(paths => {
        setAllowedPaths(new Set(paths));
      })
      .catch(error => {
        console.error('Failed to fetch allowed page paths:', error);
        setAllowedPaths(new Set());
      })
      .finally(() => {
        setIsAllowedPagesLoading(false);
      });
  }, [user?.id]);

  useEffect(() => {
    // If a static menu was explicitly provided, use it as-is — don't override with dynamic admin menu
    if (propMenuItems && propMenuItems.length > 0) {
      setMenuItems(propMenuItems);
      return;
    }

    getAdminMenuItems(counts)
      .then(items => {
        if (items && items.length > 0) {
          setMenuItems(items);
        } else {
          setMenuItems(staticMenuItems);
        }
      })
      .catch(error => {
        console.error('Failed to load dynamic menu items:', error);
        setMenuItems(staticMenuItems);
      });
  }, [propMenuItems, counts]);

  useEffect(() => {
    const handleServiceChange = () => {
      clearServiceCache();
      getAdminMenuItems(counts)
        .then(setMenuItems)
        .catch(error => {
          console.error('Failed to refresh menu items:', error);
        });
    };

    window.addEventListener('serviceUpdated', handleServiceChange);
    return () => window.removeEventListener('serviceUpdated', handleServiceChange);
  }, [counts]);

  // Build the final filtered menu when allowedPaths changes
  const filteredMenuItems = (items: MenuItem[]): MenuItem[] => {
    if (isAllowedPagesLoading) return []; // show empty while loading
    if (allowedPaths.size === 0) return []; // user has no access — show empty

    return items
      .filter(item => {
        if (item.type === 'separator') return true;
        return isAllowed(item.path, allowedPaths);
      })
      .map(item => {
        if (!item.hasSubmenu || !item.submenuItems) return item;

        const filteredSubmenu = item.submenuItems
          .filter(sub => isAllowed(sub.path, allowedPaths))
          .map(sub => ({ ...sub }));

        // Only include the parent if it has at least one allowed submenu
        if (filteredSubmenu.length === 0) return null;

        return { ...item, submenuItems: filteredSubmenu };
      })
      .filter((item): item is MenuItem => item !== null);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={cn('min-h-screen bg-gray-50')}>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} menuItems={filteredMenuItems(menuItems)} />

      <div className={cn('lg:pl-64')}>
        <Header onToggleSidebar={toggleSidebar} />

        <main className={cn('p-4 md:p-6')}>
          <AllowedPagesProvider allowedPaths={allowedPaths} isLoading={isAllowedPagesLoading}>
            {children}
          </AllowedPagesProvider>
        </main>
      </div>
    </div>
  );
};
