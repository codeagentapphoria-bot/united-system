// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { getAdminMenuItems, adminMenuItems as staticMenuItems } from '@/config/admin-menu';

// Hooks
import { useAdminNotifications } from '@/hooks/notifications/useAdminNotifications';

// Utils
import { cn } from '@/lib/utils';
import { clearServiceCache } from '@/utils/dynamic-menu';

// Custom Components
import { Header } from './Header';
import { Sidebar } from './Sidebar';

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

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  menuItems: propMenuItems,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Initialize with propMenuItems or staticMenuItems as fallback
  const [menuItems, setMenuItems] = useState<MenuItem[]>(propMenuItems || staticMenuItems);
  const { counts } = useAdminNotifications();

  useEffect(() => {
    // Always try to load dynamic menu items for fresh data
    getAdminMenuItems(counts)
      .then((items) => {
        // Only update if we got valid items
        if (items && items.length > 0) {
          setMenuItems(items);
        } else {
          // Fallback to propMenuItems or staticMenuItems
          const fallback = propMenuItems || staticMenuItems;
          if (fallback.length > 0) {
            setMenuItems(fallback);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load dynamic menu items:', error);
        // Fallback to propMenuItems or staticMenuItems on error
        const fallback = propMenuItems || staticMenuItems;
        if (fallback.length > 0) {
          setMenuItems(fallback);
        }
      });
  }, [propMenuItems, counts]); // Re-run if propMenuItems or counts change

  // Refresh menu when services change (e.g., after creating/updating a service)
  useEffect(() => {
    const handleServiceChange = () => {
      clearServiceCache();
      getAdminMenuItems(counts)
        .then(setMenuItems)
        .catch((error) => {
          console.error('Failed to refresh menu items:', error);
          // Keep current menu items on error
        });
    };

    window.addEventListener('serviceUpdated', handleServiceChange);
    return () => window.removeEventListener('serviceUpdated', handleServiceChange);
  }, [counts]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={cn("min-h-screen bg-gray-50") }>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} menuItems={menuItems} />
      
      <div className={cn("lg:pl-64")}>
        <Header onToggleSidebar={toggleSidebar} />
        
        <main className={cn("p-4 md:p-6") }>
          {children}
        </main>
      </div>
    </div>
  );
};

