import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import type { Announcement, AnnouncementType } from '@/types/announcement';
import { FiInfo, FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<AnnouncementType, { icon: React.ReactNode; bgClass: string; borderClass: string; badgeClass: string }> = {
  info: {
    icon: <FiInfo size={14} />,
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  warning: {
    icon: <FiAlertTriangle size={14} />,
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  alert: {
    icon: <FiAlertCircle size={14} />,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
  },
  success: {
    icon: <FiCheckCircle size={14} />,
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
  },
};

interface AnnouncementItemProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}

function AnnouncementItem({ announcement, onDismiss }: AnnouncementItemProps) {
  const config = TYPE_CONFIG[announcement.type];

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border', config.bgClass, config.borderClass)}>
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-800">{announcement.title}</span>
          <Badge variant="outline" className={cn('text-[10px]', config.badgeClass)}>
            {announcement.type}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{announcement.body}</p>
      </div>
      <button
        onClick={() => onDismiss(announcement.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 -m-1"
        aria-label="Dismiss announcement"
      >
        <FiX size={14} />
      </button>
    </div>
  );
}

export function AnnouncementBanner() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = announcements.filter(a => !dismissed.has(a.id));

  if (isLoading || visible.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  return (
    <div className="space-y-2">
      {visible.map(announcement => (
        <AnnouncementItem
          key={announcement.id}
          announcement={announcement}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
