import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight, FiLock, FiX } from 'react-icons/fi';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

interface SubmenuItem {
  path: string;
  label: string;
  badgeCount?: number;
  isCategoryHeader?: boolean;
  type?: 'separator';
  category?: string;
  system?: string;
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

// Route implementation status is now fully driven by the database (pages + role_pages tables).
// The allowedPaths filter in buildUnifiedMenu is the single source of truth for access control.
// No hardcoded allowlist should exist here.

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, menuItems }) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [collapsedSystemGroups, setCollapsedSystemGroups] = useState<string[]>([]);

  // Default all system groups to collapsed when menuItems are available
  useEffect(() => {
    const groups: string[] = [];
    menuItems.forEach(item => {
      if (item.type === 'separator' && item.system) groups.push(item.system);
    });
    setCollapsedSystemGroups(groups);
  }, [menuItems]);
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize all categories as collapsed by default
  useEffect(() => {
    const allCategories = new Set<string>();
    menuItems.forEach(item => {
      item.submenuItems?.forEach(sub => {
        if (sub.category) allCategories.add(sub.category);
      });
    });
    setCollapsedCategories(Array.from(allCategories));
  }, [menuItems]);

  // Auto-expand submenus and system groups when their submenu items are active
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.hasSubmenu && item.submenuItems && item.label) {
        const hasActiveSubmenu = item.submenuItems.some(subItem => location.pathname === subItem.path);
        if (hasActiveSubmenu) {
          setExpandedMenus(prev => {
            if (!prev.includes(item.label!)) {
              return [...prev, item.label!];
            }
            return prev;
          });

          // Auto-expand category if a service in it is active
          const activeSubItem = item.submenuItems.find(
            subItem => location.pathname === subItem.path && subItem.category
          );
          if (activeSubItem?.category) {
            setCollapsedCategories(prev => prev.filter(cat => cat !== activeSubItem.category));
          }
        }
      }

      // Auto-expand system group if a top-level item or its submenu is active
      if (item.type === 'separator' && item.system) {
        // Find the next group of items belonging to this separator
        const itemIndex = menuItems.indexOf(item);
        const groupItems: MenuItem[] = [];
        for (let j = itemIndex + 1; j < menuItems.length; j++) {
          const next = menuItems[j];
          if (next.type === 'separator') break;
          groupItems.push(next);
        }

        const isAnyInGroupActive = groupItems.some(
          gItem =>
            gItem.path === location.pathname ||
            (gItem.submenuItems?.some(sub => sub.path === location.pathname))
        );

        if (isAnyInGroupActive) {
          setCollapsedSystemGroups(prev => prev.filter(s => s !== item.system));
        }
      }
    });
  }, [location.pathname, menuItems]);

  const toggleSubmenu = (label: string) => {
    setExpandedMenus(prev => (prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]));
  };

  const toggleCategory = (categoryName: string) => {
    setCollapsedCategories(prev =>
      prev.includes(categoryName) ? prev.filter(item => item !== categoryName) : [...prev, categoryName]
    );
  };

  const toggleSystemGroup = (system: string) => {
    setCollapsedSystemGroups(prev =>
      prev.includes(system) ? prev.filter(s => s !== system) : [...prev, system]
    );
  };

  // Helper function to check if any submenu item is active
  const isSubmenuActive = (item: MenuItem): boolean => {
    if (!item.hasSubmenu || !item.submenuItems) return false;
    return item.submenuItems.some(subItem => location.pathname === subItem.path);
  };

  // Render a single menu item (handles submenus, navlinks, and unimplemented items)
  const renderMenuItem = (item: MenuItem, index: number): React.ReactNode => {
    const isExpanded = item.label ? expandedMenus.includes(item.label) : false;
    const hasActiveSubmenu = isSubmenuActive(item);

    // When hasSubmenu: use <div> as outer wrapper — <li> cannot contain <div> which
    // contains <ul><li>, so we avoid invalid nesting by using <div> for that branch.
    // When no submenu: use <li> wrapper for semantic list item.
    return item.hasSubmenu ? (
      <div key={item.path || index}>
        <button
          onClick={() => item.label && toggleSubmenu(item.label)}
          className={cn(
            'flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left',
            hasActiveSubmenu
              ? 'bg-primary-600 text-white'
              : 'text-heading-600 hover:bg-primary-50 hover:text-primary-700'
          )}
        >
          <div className="flex items-center space-x-3">
            <span className="h-5 w-5">{item.icon}</span>
            <span>{item.label}</span>
          </div>
          <div className="flex items-center space-x-2">
            {item.badgeCount !== undefined && item.badgeCount > 0 && (
              <Badge className="bg-red-600 text-white text-xs font-semibold px-1.5 py-0.5 min-w-[20px] text-center">
                {item.badgeCount > 99 ? '99+' : item.badgeCount}
              </Badge>
            )}
            {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
          </div>
        </button>

        {/* Submenu */}
        {isExpanded && item.submenuItems && (
          <div onClick={(e) => e.stopPropagation()}>
            <ul className="mt-1 ml-2 space-y-1">
              {item.submenuItems.map((subItem, subIndex) => {
                if (subItem.type === 'separator') {
                  return (
                    <li key={`sep-${subIndex}`} className="py-2">
                      <Separator className="my-1" />
                    </li>
                  );
                }

                const isCategoryHeader = subItem.label.startsWith('▾ ') || subItem.isCategoryHeader;

                if (isCategoryHeader) {
                  const categoryName = subItem.label.replace('▾ ', '').replace(' ▾', '');
                  const isCategoryCollapsed = collapsedCategories.includes(categoryName);
                  return (
                    <li key={`cat-${subIndex}`}>
                      <button
                        onClick={() => toggleCategory(categoryName)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-primary-700 bg-primary-50 rounded-md mt-2 first:mt-0 hover:bg-primary-100 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'transition-transform',
                              isCategoryCollapsed && 'rotate-[-90deg]'
                            )}
                          >
                            <FiChevronDown size={14} />
                          </span>
                          {categoryName}
                        </span>
                      </button>
                    </li>
                  );
                }

                const serviceCategory = subItem.category;
                const isParentCategoryCollapsed =
                  serviceCategory && collapsedCategories.includes(serviceCategory);

                if (isParentCategoryCollapsed) {
                  return null;
                }

                const isCategoryService = !!subItem.category;

                return (
                  <li key={subItem.path}>
                    <button
                      onClick={() => {
                        navigate(subItem.path);
                        onClose();
                      }}
                      className={cn(
                        isCategoryService
                          ? 'flex items-center justify-between ml-6 px-2 py-1.5 rounded-md text-sm transition-colors'
                          : 'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors w-full',
                        location.pathname === subItem.path
                          ? 'bg-primary-600 text-white'
                          : isCategoryService
                            ? 'text-gray-500 hover:bg-primary-50 hover:text-primary-700'
                            : 'text-heading-500 hover:bg-primary-50 hover:text-primary-700'
                      )}
                    >
                      <span>{subItem.label}</span>
                      {subItem.badgeCount !== undefined && subItem.badgeCount > 0 && (
                        <Badge className="bg-red-600 text-white text-xs font-semibold px-1.5 py-0.5 min-w-[20px] text-center">
                          {subItem.badgeCount > 99 ? '99+' : subItem.badgeCount}
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    ) : (
      <li key={item.path || index}>
        <NavLink
          to={item.path || '#'}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={({ isActive }: { isActive: boolean }) =>
            cn(
              'flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-heading-600 hover:bg-primary-50 hover:text-primary-700'
            )
          }
        >
          <div className="flex items-center space-x-3">
            <span className="h-5 w-5">{item.icon}</span>
            <span>{item.label}</span>
          </div>
          {item.badgeCount !== undefined && item.badgeCount > 0 && (
            <Badge className="bg-red-600 text-white text-xs font-semibold px-1.5 py-0.5 min-w-[20px] text-center">
              {item.badgeCount > 99 ? '99+' : item.badgeCount}
            </Badge>
          )}
        </NavLink>
      </li>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 bg-white shadow-lg shadow-gray-300/60 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 h-[90px]">
            <div className="flex items-center space-x-3">
              <img src="/logo-white.svg" alt="City of Borongan Logo" className="h-8 w-auto" />
              <div>
                <h2 className="text-sm font-bold text-primary md:text-md lg:text-lg">City of Borongan</h2>
                <p className="text-xs text-gray-500 md:text-xs lg:text-sm">Local Government System</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <FiX size={20} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {menuItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Loading menu...</p>
              </div>
            ) : (
              (() => {
                // Partition menuItems into system groups and standalone items
                // A "group" starts at a separator-label item and collects all following non-separator-label items
                // until the next separator-label item.
                type Group = { system: string; label: string; items: MenuItem[] };
                const groups: Group[] = [];
                let currentGroup: Group | null = null;
                const standaloneItems: MenuItem[] = [];

                menuItems.forEach(item => {
                  if (item.type === 'separator' && item.label && item.system) {
                    currentGroup = { system: item.system, label: item.label, items: [] };
                    groups.push(currentGroup);
                  } else if (item.type === 'separator') {
                    currentGroup = null; // gap separator — reset current group tracker
                  } else if (currentGroup) {
                    currentGroup.items.push(item);
                  } else {
                    standaloneItems.push(item);
                  }
                });

                const groupsWithItems = groups.filter(g => g.items.length > 0);
                const singleSystem = groupsWithItems.length === 1;

                return (
                  <ul className="space-y-1">
                    {/* Render standalone items first (no group) */}
                    {standaloneItems.map((item, index) => renderMenuItem(item, index))}

                    {/* Single-system: render items directly, no collapsible group */}
                    {singleSystem && groupsWithItems[0].items.map((item, index) => renderMenuItem(item, index))}

                    {/* Multi-system: collapsible groups */}
                    {!singleSystem && groupsWithItems.map(group => {
                      const isCollapsed = collapsedSystemGroups.includes(group.system);
                      // Sum badge counts from all items in this group
                      const groupBadgeCount = group.items.reduce(
                        (sum, item) => sum + (item.badgeCount ?? 0),
                        0
                      );
                      return (
                        <li key={`system-group-${group.system}`}>
                          {/* Group header — clickable to expand/collapse */}
                          <button
                            onClick={() => toggleSystemGroup(group.system)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <span>{group.label}</span>
                            <span className="flex items-center gap-2">
                              {groupBadgeCount > 0 && isCollapsed && (
                                <Badge className="bg-red-600 text-white text-xs font-semibold px-1.5 py-0.5 min-w-[20px] text-center">
                                  {groupBadgeCount > 99 ? '99+' : groupBadgeCount}
                                </Badge>
                              )}
                              <span
                                className={cn(
                                  'transition-transform duration-200',
                                  isCollapsed ? '-rotate-90' : 'rotate-0'
                                )}
                              >
                                <FiChevronDown size={14} />
                              </span>
                            </span>
                          </button>

                          {/* Group items — hidden when collapsed. Wrap in <ul> since renderMenuItem returns <li> */}
                          {!isCollapsed && (
                            <ul className="pl-2">
                              {group.items.map((item, index) => renderMenuItem(item, index))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                );
              })()
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">© 2026 City of Borongan</p>
          </div>
        </div>
      </aside>
    </>
  );
};
