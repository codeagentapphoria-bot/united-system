// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { getAdminMenuItems, adminMenuItems as staticMenuItems } from '@/config/admin-menu';
import { libresakayMenuItems } from '@/config/libre-sakay-menu';
import { cityPopulationMenuItems } from '@/config/city-population-menu';

// Hooks
import { useAdminNotifications } from '@/hooks/notifications/useAdminNotifications';
import { useAuth } from '@/context/AuthContext';
import { useLibreSakayBadgeOverrides } from '@/context/LibreSakayBadgeContext';

// Utils
import { cn } from '@/lib/utils';
import { clearServiceCache } from '@/utils/dynamic-menu';
import { userService } from '@/services/api/user.service';
import { SYSTEM_LABELS } from '@/constants/systemLabels';

// Custom Components
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AllowedPagesProvider } from '../../context/AllowedPagesContext';
import { ProfileModalProvider } from '@/context/ProfileModalContext';
import { ProfileModal } from '@/components/modals/profile/ProfileModal';

interface SubmenuItem {
  path: string;
  label: string;
  category?: string;
}

interface MenuItem {
  path?: string;
  label?: string;
  icon?: React.ReactNode;
  type?: 'separator';
  hasSubmenu?: boolean;
  submenuItems?: SubmenuItem[];
  badgeCount?: number;
  system?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/** Returns true if a menu item path (or one of its submenu paths) is in the allowed list. */
function isAllowed(path: string | undefined, allowedPaths: Set<string>): boolean {
  if (!path) return true; // separators are always shown
  return allowedPaths.has(path);
}

const SYSTEM_ORDER = ['core', 'libre-sakay', 'libre-medisina', 'government-programs', 'services', 'city-population'];

/**
 * Builds a unified, system-grouped menu from all configured menu items.
 * - Merges core + libre-sakay items
 * - Filters by allowedPaths
 * - Groups by system, inserting labeled separator headers between groups
 */
function buildUnifiedMenu(
  items: MenuItem[],
  allowedPaths: Set<string>,
  badgeOverrides: Map<string, number>
): MenuItem[] {
  // Filter items by allowedPaths
  const filtered = items
    .filter(item => {
      if (item.type === 'separator') return true;
      return isAllowed(item.path, allowedPaths);
    })
    .map(item => {
      if (!item.hasSubmenu || !item.submenuItems) return item;

      const filteredSubmenu = item.submenuItems
        .filter(sub => isAllowed(sub.path, allowedPaths))
        .map(sub => ({ ...sub }));

      if (filteredSubmenu.length === 0) return null;
      return { ...item, submenuItems: filteredSubmenu };
    })
    .filter((item): item is MenuItem => item !== null);

  // Group by system while preserving order
  const bySystem = new Map<string, MenuItem[]>();
  filtered.forEach(item => {
    const sys = item.system || 'core';
    if (!bySystem.has(sys)) bySystem.set(sys, []);
    bySystem.get(sys)!.push(item);
  });

  // Flatten with system-group header separators — only add group if it has items
  const result: MenuItem[] = [];
  SYSTEM_ORDER.forEach(system => {
    const groupItems = bySystem.get(system);
    if (!groupItems || groupItems.length === 0) return;
    if (result.length > 0) {
      // Gap separator between groups
      result.push({ type: 'separator' as const });
    }
    // System group header
    result.push({ type: 'separator' as const, label: SYSTEM_LABELS[system] || system, system });
    result.push(...groupItems);
  });

  // Append any systems not in SYSTEM_ORDER (e.g. new ones added later)
  bySystem.forEach((groupItems, system) => {
    if (SYSTEM_ORDER.includes(system)) return;
    if (groupItems.length === 0) return;
    if (result.length > 0) result.push({ type: 'separator' as const });
    result.push({ type: 'separator' as const, label: SYSTEM_LABELS[system] || system, system });
    result.push(...groupItems);
  });

  // Remove separator-label headers whose groups ended up empty after filtering.
  // Walk through result; only keep a group header + its items if there's at
  // least one real (non-separator) item in that group.
  const final: MenuItem[] = [];
  let i = 0;
  while (i < result.length) {
    const item = result[i];
    const isGroupHeader = item.type === 'separator' && !!item.label && !!item.system;
    if (isGroupHeader) {
      // Collect all items belonging to this group (until next group header or end)
      const groupItems: MenuItem[] = [];
      let j = i + 1;
      while (
        j < result.length &&
        !(result[j].type === 'separator' && !!result[j].label && !!result[j].system)
      ) {
        if (result[j].type !== 'separator') {
          groupItems.push(result[j]);
        }
        j++;
      }
      if (groupItems.length > 0) {
        final.push(item, ...groupItems);
      }
      i = j;
    } else {
      final.push(item);
      i++;
    }
  }

  // Overlay badge counts from badgeOverrides (e.g. Libre Sakay pending counts) onto matching paths
  if (badgeOverrides.size > 0) {
    final.forEach(item => {
      if (item.path && badgeOverrides.has(item.path)) {
        item.badgeCount = badgeOverrides.get(item.path);
      }
    });
  }

  return final;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(staticMenuItems);
  const [allowedPaths, setAllowedPaths] = useState<Set<string>>(new Set());
  const [isAllowedPagesLoading, setIsAllowedPagesLoading] = useState(true);
  const { counts } = useAdminNotifications();
  const { user } = useAuth();
  const { badgeOverrides } = useLibreSakayBadgeOverrides();

  // Fetch user's allowed page paths from backend
  useEffect(() => {
    if (!user?.id) return;

    setIsAllowedPagesLoading(true);
    userService
      .getAllowedPagePaths(user.id)
      .then(pages => {
        setAllowedPaths(new Set(pages.map(p => p.path)));
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
  }, [counts]);

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

  // Build one unified sidebar for all pages: merge menuItems + libresakayMenuItems, filter by role,
  // group by system. Badge counts for Libre Sakay items are injected via badgeOverrides context.
  const sidebarMenuItems = React.useMemo(() => {
    if (isAllowedPagesLoading) return [];
    if (allowedPaths.size === 0) return [];

    const allItems = [...menuItems, ...libresakayMenuItems, ...cityPopulationMenuItems];
    return buildUnifiedMenu(allItems, allowedPaths, badgeOverrides);
  }, [isAllowedPagesLoading, allowedPaths, badgeOverrides, menuItems]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <ProfileModalProvider>
      <div className={cn('min-h-screen bg-gray-50')}>
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} menuItems={sidebarMenuItems} />

        <div className={cn('lg:pl-64')}>
          <Header onToggleSidebar={toggleSidebar} />

          <main className={cn('p-4 md:p-6')}>
            <AllowedPagesProvider allowedPaths={allowedPaths} isLoading={isAllowedPagesLoading}>
              {children}
            </AllowedPagesProvider>
          </main>
        </div>

        {/* Global Profile Modal */}
        <ProfileModal />
      </div>
    </ProfileModalProvider>
  );
};
