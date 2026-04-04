import { adminMenuItems } from '@/config/admin-menu';

export interface ResourceOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Extracts all resources from admin menu items
 * Converts paths to resource identifiers (e.g., /admin/dashboard -> dashboard)
 */
export const getAdminResources = (): ResourceOption[] => {
  const resources: ResourceOption[] = [];

  adminMenuItems.forEach((item) => {
    // Skip separators
    if (item.type === 'separator') {
      return;
    }

    // Skip items without path
    if (!item.path) {
      return;
    }

    // Extract resource from path (e.g., /admin/dashboard -> dashboard)
    const resourceValue = item.path.replace('/admin/', '').replace(/\//g, '-');
    const resourceLabel = item.label || '';

    // Add main menu item as resource
    resources.push({
      value: resourceValue,
      label: resourceLabel,
      description: `Access to ${resourceLabel}`,
    });

    // Add submenu items as resources if they exist
    if (item.hasSubmenu && item.submenuItems) {
      item.submenuItems.forEach((subItem) => {
        if (!subItem.path) {
          return;
        }
        const subResourceValue = subItem.path.replace('/admin/', '').replace(/\//g, '-');
        const subResourceLabel = `${resourceLabel} - ${subItem.label || ''}`;
        
        resources.push({
          value: subResourceValue,
          label: subResourceLabel,
          description: `Access to ${subItem.label || ''} under ${resourceLabel}`,
        });
      });
    }
  });

  return resources;
};

