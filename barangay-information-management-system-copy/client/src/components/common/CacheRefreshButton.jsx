import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Database } from 'lucide-react';
import { clearCacheOnRefresh, clearCachePatternsOnRefresh } from '@/utils/cacheRefresh';
import api from '@/utils/api';

/**
 * Button component to manually refresh Redis cache
 * Can be used in admin interfaces for manual cache management
 */
const CacheRefreshButton = ({ 
  patterns = [], 
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  children = 'Refresh Cache'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      if (patterns.length > 0) {
        // Clear specific patterns
        await clearCachePatternsOnRefresh(patterns);
        toast({
          title: 'Cache Refreshed',
          description: `Cleared cache patterns: ${patterns.join(', ')}`,
        });
      } else {
        // Clear all cache
        await clearCacheOnRefresh();
        toast({
          title: 'Cache Refreshed',
          description: 'All Redis cache has been cleared successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Cache Refresh Failed',
        description: 'Failed to clear cache. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2"
    >
      {showIcon && (
        isRefreshing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Database className="h-4 w-4" />
        )
      )}
      {children}
    </Button>
  );
};

export default CacheRefreshButton;
