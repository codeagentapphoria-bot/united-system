// React imports
import React from 'react';

// Hooks
import { useSocket } from '@/context/SocketContext';

// UI Components
import { Badge } from '@/components/ui/badge';

// Icons
import { FiWifi, FiWifiOff } from 'react-icons/fi';

// Utils
import { cn } from '@/lib/utils';

export const SocketStatusIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const { isConnected } = useSocket();

  return (
    <Badge
      variant={isConnected ? 'default' : 'destructive'}
      className={cn('flex items-center gap-1.5 px-2 py-1 text-xs', className)}
    >
      {isConnected ? (
        <>
          <FiWifi size={12} />
          <span>Connected</span>
        </>
      ) : (
        <>
          <FiWifiOff size={12} />
          <span>Disconnected</span>
        </>
      )}
    </Badge>
  );
};


