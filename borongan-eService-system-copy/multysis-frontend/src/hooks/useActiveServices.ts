import { useState, useEffect, useRef } from 'react';
import { serviceService, type Service } from '@/services/api/service.service';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  services: Service[];
  paymentStatuses: Record<string, string[]>;
  timestamp: number;
}

let cachedEntry: CacheEntry | null = null;
let fetchPromise: Promise<CacheEntry> | null = null;

const fetchServicesWithCache = async (): Promise<CacheEntry> => {
  const now = Date.now();

  if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
    return cachedEntry;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const services = await serviceService.getActiveServices();
      
      const paymentStatuses: Record<string, string[]> = {};
      services.forEach((service) => {
        if (service.paymentStatuses && Array.isArray(service.paymentStatuses)) {
          paymentStatuses[service.code] = service.paymentStatuses;
        }
      });

      const entry: CacheEntry = {
        services,
        paymentStatuses,
        timestamp: now,
      };

      cachedEntry = entry;
      return entry;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

export const useActiveServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const loadServices = async () => {
      try {
        const entry = await fetchServicesWithCache();
        setServices(entry.services);
        setPaymentStatuses(entry.paymentStatuses);
      } catch (error) {
        console.error('Failed to fetch active services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();
  }, []);

  return {
    services,
    paymentStatuses,
    isLoading,
  };
};

export const clearActiveServicesCache = () => {
  cachedEntry = null;
};
