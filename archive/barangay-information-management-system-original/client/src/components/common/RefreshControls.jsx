import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { RefreshCw, Database, RotateCcw, Settings } from 'lucide-react';
import { useCrudRefresh } from '@/hooks/useCrudRefresh';

/**
 * Component that provides refresh controls for CRUD operations
 * Can be used in admin pages to give users control over data refresh
 */
const RefreshControls = ({ 
  variant = 'outline',
  size = 'sm',
  showLabels = false,
  className = ''
}) => {
  const { manualRefresh, softRefresh, isRefreshing } = useCrudRefresh();
  const [isSoftRefreshing, setIsSoftRefreshing] = useState(false);

  const handleSoftRefresh = async () => {
    setIsSoftRefreshing(true);
    try {
      await softRefresh();
    } finally {
      setTimeout(() => setIsSoftRefreshing(false), 1000);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isRefreshing || isSoftRefreshing}
          className={`flex items-center gap-2 ${className}`}
        >
          <RefreshCw className={`h-4 w-4 ${(isRefreshing || isSoftRefreshing) ? 'animate-spin' : ''}`} />
          {showLabels && 'Refresh'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleSoftRefresh} disabled={isSoftRefreshing}>
          <Database className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Clear Cache Only</span>
            <span className="text-xs text-muted-foreground">
              Clear cached data, keep page open
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={manualRefresh} disabled={isRefreshing}>
          <RotateCcw className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Full Page Refresh</span>
            <span className="text-xs text-muted-foreground">
              Reload entire page with fresh data
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Settings className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Auto-refresh: Enabled</span>
            <span className="text-xs text-muted-foreground">
              Operations trigger automatic refresh
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RefreshControls;
