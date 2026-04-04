import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight, FiLock, FiX } from 'react-icons/fi';
import { NavLink, useLocation } from 'react-router-dom';

interface SubmenuItem {
  path: string;
  label: string;
  badgeCount?: number;
  isCategoryHeader?: boolean;
  type?: 'separator';
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
}

// List of implemented routes
const implementedRoutes = [
  '/admin/dashboard',
  '/admin/registration-workflow',
  '/admin/e-government/social-amelioration',
  '/admin/e-government/reports',
  '/admin/general-settings/address',
  '/admin/general-settings/smart-city-services',
  '/admin/general-settings/government-program',
  '/admin/general-settings/appointment',
  '/admin/general-settings/faq',
  '/admin/general-settings/tax-profiles',
  '/admin/access-control/role-management',
  '/admin/access-control/permissions',
  '/admin/access-control/user-management',
];

// Check if a route is implemented
const isRouteImplemented = (path: string): boolean => {
  // Check if it's in the implemented routes list
  if (implementedRoutes.includes(path)) {
    return true;
  }

  // Check if it's a dynamic e-government service route (pattern: /admin/e-government/:serviceCode)
  // Dynamic service routes are always implemented since we have the ServicePage component
  if (path.startsWith('/admin/e-government/') && path !== '/admin/e-government') {
    // Exclude known static routes that might not be implemented yet
    const staticRoutes = [
      '/admin/e-government/social-amelioration',
      '/admin/e-government/gcash-reports',
      '/admin/e-government/payments',
      '/admin/e-government/billings',
      '/admin/e-government/miscellaneous-fee',
      '/admin/e-government/qr-scanner',
    ];

    // If it's not a static route, it's a dynamic service route and is implemented
    if (!staticRoutes.includes(path)) {
      return true;
    }
  }

  return false;
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, menuItems }) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const location = useLocation();

  // Initialize all categories as collapsed by default
  useEffect(() => {
    const allCategories = new Set<string>();
    menuItems.forEach((item) => {
      item.submenuItems?.forEach((sub) => {
        if (sub.category) allCategories.add(sub.category);
      });
    });
    setCollapsedCategories(Array.from(allCategories));
  }, [menuItems]);

  // Auto-expand submenus when their submenu items are active
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.hasSubmenu && item.submenuItems && item.label) {
        const hasActiveSubmenu = item.submenuItems.some(
          (subItem) => location.pathname === subItem.path
        );
        if (hasActiveSubmenu) {
          setExpandedMenus((prev) => {
            if (!prev.includes(item.label!)) {
              return [...prev, item.label!];
            }
            return prev;
          });

          // Auto-expand category if a service in it is active
          const activeSubItem = item.submenuItems.find(
            (subItem) => location.pathname === subItem.path && subItem.category
          );
          if (activeSubItem?.category) {
            setCollapsedCategories((prev) =>
              prev.filter(cat => cat !== activeSubItem.category)
            );
          }
        }
      }
    });
  }, [location.pathname, menuItems]);

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const toggleCategory = (categoryName: string) => {
    setCollapsedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((item) => item !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Helper function to check if any submenu item is active
  const isSubmenuActive = (item: MenuItem): boolean => {
    if (!item.hasSubmenu || !item.submenuItems) return false;
    return item.submenuItems.some((subItem) => location.pathname === subItem.path);
  };
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

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
              <img
                src="/logo-white.svg"
                alt="City of Borongan Logo"
                className="h-8 w-auto"
              />
              <div>
                <h2 className="text-sm font-bold text-primary md:text-md lg:text-lg">City of Borongan</h2>
                <p className="text-xs text-gray-500 md:text-xs lg:text-sm">Local Government System</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
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
              <ul className="space-y-1">
                {menuItems.map((item, index) => {
                  if (item.type === 'separator') {
                    return (
                      <li key={`separator-${index}`} className="py-2">
                        <Separator />
                      </li>
                    );
                  }

                  const isExpanded = item.label ? expandedMenus.includes(item.label) : false;
                  const hasActiveSubmenu = isSubmenuActive(item);

                  return (
                    <li key={item.path || index}>
                      {item.hasSubmenu ? (
                        <div>
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
                              {isExpanded ? (
                                <FiChevronDown size={16} />
                              ) : (
                                <FiChevronRight size={16} />
                              )}
                            </div>
                          </button>

                          {/* Submenu */}
                          {isExpanded && item.submenuItems && (
                            <ul className="mt-1 ml-2 space-y-1">
                              {item.submenuItems.map((subItem, subIndex) => {
                                // Check if this is a separator
                                if (subItem.type === 'separator') {
                                  return (
                                    <li key={`sep-${subIndex}`} className="py-2">
                                      <Separator className="my-1" />
                                    </li>
                                  );
                                }

                                // Check if this is a category header (starts with category indicator)
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
                                          <span className={cn('transition-transform', isCategoryCollapsed && 'rotate-[-90deg]')}>
                                            <FiChevronDown size={14} />
                                          </span>
                                          {categoryName}
                                        </span>
                                      </button>
                                    </li>
                                  );
                                }

                                // Hide service items if their category is collapsed
                                const serviceCategory = subItem.category;
                                const isParentCategoryCollapsed = serviceCategory && collapsedCategories.includes(serviceCategory);

                                if (isParentCategoryCollapsed) {
                                  return null;
                                }

                                const isImplemented = isRouteImplemented(subItem.path);
                                const isCategoryService = !!subItem.category;

                                return (
                                  <li key={subItem.path}>
                                    {isImplemented ? (
                                      <NavLink
                                        to={subItem.path}
                                        onClick={onClose}
                                        className={({ isActive }: { isActive: boolean }) =>
                                          cn(
                                            isCategoryService
                                              ? 'flex items-center justify-between ml-6 px-2 py-1.5 rounded-md text-sm transition-colors'
                                              : 'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                                            isActive
                                              ? 'bg-primary-600 text-white'
                                              : isCategoryService
                                                ? 'text-gray-500 hover:bg-primary-50 hover:text-primary-700'
                                                : 'text-heading-500 hover:bg-primary-50 hover:text-primary-700'
                                          )
                                        }
                                      >
                                        <span>{subItem.label}</span>
                                        {subItem.badgeCount !== undefined && subItem.badgeCount > 0 && (
                                          <Badge className="bg-red-600 text-white text-xs font-semibold px-1.5 py-0.5 min-w-[20px] text-center">
                                            {subItem.badgeCount > 99 ? '99+' : subItem.badgeCount}
                                          </Badge>
                                        )}
                                      </NavLink>
                                    ) : (
                                      <div
                                        className={cn(
                                          isCategoryService
                                            ? 'flex items-center justify-between ml-6 px-2 py-1.5 rounded-md text-xs transition-colors'
                                            : 'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                                          'text-gray-400 cursor-not-allowed bg-gray-50 opacity-60 hidden'
                                        )}
                                        title="Not yet implemented"
                                      >
                                        <span>{subItem.label}</span>
                                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-400">
                                          <FiLock size={10} className="mr-1" />
                                          Soon
                                        </Badge>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : (
                        (() => {
                          const isImplemented = item.path ? isRouteImplemented(item.path) : false;
                          return isImplemented ? (
                            <NavLink
                              to={item.path || '#'}
                              onClick={onClose}
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
                          ) : (
                            <div
                              className={cn(
                                'flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                                'text-gray-400 cursor-not-allowed bg-gray-50 opacity-60 hidden'
                              )}
                              title="Not yet implemented"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="h-5 w-5">{item.icon}</span>
                                <span>{item.label}</span>
                              </div>
                              <Badge variant="outline" className="text-xs border-gray-300 text-gray-400">
                                <FiLock size={10} className="mr-1" />
                                Soon
                              </Badge>
                            </div>
                          );
                        })()
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              © 2026 City of Borongan
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
