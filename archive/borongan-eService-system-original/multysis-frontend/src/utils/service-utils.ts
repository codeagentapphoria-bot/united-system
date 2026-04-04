import type { Service } from '@/services/api/service.service';

/**
 * Convert kebab-case URL parameter to service code (UPPER_SNAKE_CASE)
 * Example: "birth-certificate" -> "BIRTH_CERTIFICATE"
 */
export const convertKebabToServiceCode = (kebabCase: string): string => {
  return kebabCase
    .split('-')
    .map(word => word.toUpperCase())
    .join('_');
};

/**
 * Convert service code (UPPER_SNAKE_CASE) to kebab-case URL format
 * Example: "BIRTH_CERTIFICATE" -> "birth-certificate"
 */
export const convertServiceCodeToKebab = (serviceCode: string): string => {
  return serviceCode
    .toLowerCase()
    .replace(/_/g, '-');
};

/**
 * Get display name for service
 * Falls back to service name if available
 */
export const getServiceDisplayName = (service: Service | null | undefined): string => {
  if (!service) return 'Service';
  return service.name || service.code || 'Unknown Service';
};

