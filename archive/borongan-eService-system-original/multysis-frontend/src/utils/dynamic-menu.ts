import { serviceService, type Service } from '@/services/api/service.service';

let cachedServices: Service[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

export const buildEGovernmentSubmenu = (services: Service[]) => {
  return services
    .filter(service => service.displayInSidebar && service.isActive)
    .sort((a, b) => a.order - b.order)
    .map(service => ({
      path: `/admin/e-government/${service.code.toLowerCase().replace(/_/g, '-')}`,
      label: service.name,
    }));
};

