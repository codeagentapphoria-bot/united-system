import { useEffect } from 'react';
import { useCacheRefresh } from '@/hooks/useCacheRefresh';
import useAuth from '@/hooks/useAuth';

/**
 * Component to handle cache refresh for specific pages/routes
 * Can be used to clear specific cache patterns based on the current page
 */
const CacheRefreshHandler = ({ 
  patterns = [], 
  enabled = true,
  page = null 
}) => {
  const { user } = useAuth();

  // Define cache patterns based on page
  const getPagePatterns = () => {
    if (patterns.length > 0) {
      return patterns;
    }

    switch (page) {
      case 'residents':
        return ['residents:*', 'resident:*'];
      case 'households':
        return ['households:*', 'household:*', 'residents:*', 'resident:*'];
      case 'pets':
        return ['pets:*', 'pet:*', 'residents:*', 'resident:*'];
      case 'users':
        return ['users:*', 'user:*'];
      case 'barangays':
        return ['barangays:*', 'barangay:*', 'residents:*', 'resident:*', 'households:*', 'household:*'];
      case 'vaccines':
        return ['vaccines:*', 'vaccine:*', 'residents:*', 'resident:*'];
      case 'inventories':
        return ['inventories:*', 'inventory:*'];
      case 'archives':
        return ['archives:*', 'archive:*'];
      default:
        return []; // Don't clear specific patterns for unknown pages
    }
  };

  const pagePatterns = getPagePatterns();

  // Use cache refresh hook with page-specific patterns
  useCacheRefresh({
    enabled: enabled && !!user,
    patterns: pagePatterns,
    clearOnAuth: true
  });

  // Component initialization - no logging needed

  return null; // This component doesn't render anything
};

export default CacheRefreshHandler;
