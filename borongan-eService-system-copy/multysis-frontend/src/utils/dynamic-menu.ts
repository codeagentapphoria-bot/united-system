import { serviceService, type Service } from '@/services/api/service.service';

let cachedServices: Service[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface MenuSection {
  type: 'section';
  title: string;
  items: MenuItem[];
  defaultExpanded?: boolean;
}

export interface MenuItem {
  type?: 'item';
  path: string;
  label: string;
}

export type MenuEntry = MenuSection | MenuItem;

export const getDynamicServices = async (): Promise<Service[]> => {
  const now = Date.now();
  
  // Return cached services if still valid
  if (cachedServices && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedServices;
  }

  try {
    const services = await serviceService.getActiveServices({
      displayInSidebar: true,
    });
    cachedServices = services;
    cacheTimestamp = now;
    return services;
  } catch (error) {
    console.error('Failed to fetch dynamic services:', error);
    // Return cached services even if expired, or empty array
    return cachedServices || [];
  }
};

export const clearServiceCache = () => {
  cachedServices = null;
  cacheTimestamp = 0;
};

export const buildEGovernmentSubmenu = (services: Service[]): MenuEntry[] => {
  const activeServices = services
    .filter(service => service.displayInSidebar && service.isActive)
    .sort((a, b) => a.order - b.order);

  // Group services by category
  const categoryGroups = new Map<string, Service[]>();
  
  activeServices.forEach(service => {
    const category = service.category || 'Other Services';
    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }
    categoryGroups.get(category)!.push(service);
  });

  // Define category order (Barangay Services first)
  const categoryOrder = ['Barangay Services', 'Civil Registry Services', 'Tax Services', 'Other Services'];
  
  // Sort categories: defined categories first (in order), then others alphabetically
  const sortedCategories = Array.from(categoryGroups.keys()).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  // Build menu entries with category sections
  const menuEntries: MenuEntry[] = sortedCategories.map(category => {
    const categoryServices = categoryGroups.get(category)!;
    
    return {
      type: 'section',
      title: category,
      defaultExpanded: category === 'Barangay Services', // Expand barangay by default
      items: categoryServices.map(service => ({
        path: `/admin/e-government/${service.code.toLowerCase().replace(/_/g, '-')}`,
        label: service.name,
      })),
    };
  });

  return menuEntries;
};

