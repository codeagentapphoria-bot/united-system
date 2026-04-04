// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Calendar } from '@/components/ui/calendar';

// Utils
import type { TileClassNameFunc } from 'react-calendar';

interface AppointmentCalendarProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  getAppointmentCount: (date: Date) => number;
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  selectedDate,
  onDateChange,
  getAppointmentCount,
}) => {
  // Tile className function to highlight dates with appointments
  const tileClassName: TileClassNameFunc = ({ date, view }) => {
    if (view === 'month') {
      const count = getAppointmentCount(date);
      
      if (count === 0) {
        return null;
      }
      
      // Different colors based on appointment count
      if (count >= 1 && count <= 2) {
        return 'bg-blue-100';
      } else if (count >= 3 && count <= 5) {
        return 'bg-blue-300';
      } else {
        // 6+ appointments
        return 'bg-blue-500';
      }
    }
    return null;
  };

  return (
    <div className="w-full">
      <style>{`
        .react-calendar__tile.bg-blue-100,
        .react-calendar__tile.bg-blue-300,
        .react-calendar__tile.bg-blue-500 {
          background-color: inherit !important;
        }
        .react-calendar__tile.bg-blue-100 {
          background-color: rgb(219 234 254) !important;
          border: 2px solid rgb(147 197 253) !important;
        }
        .react-calendar__tile.bg-blue-300 {
          background-color: rgb(147 197 253) !important;
          border: 2px solid rgb(59 130 246) !important;
        }
        .react-calendar__tile.bg-blue-500 {
          background-color: rgb(59 130 246) !important;
          border: 2px solid rgb(37 99 235) !important;
          color: white !important;
        }
        .react-calendar__tile.bg-blue-100:hover {
          background-color: rgb(191 219 254) !important;
          border-color: rgb(96 165 250) !important;
        }
        .react-calendar__tile.bg-blue-300:hover {
          background-color: rgb(96 165 250) !important;
          border-color: rgb(37 99 235) !important;
        }
        .react-calendar__tile.bg-blue-500:hover {
          background-color: rgb(37 99 235) !important;
          border-color: rgb(29 78 216) !important;
        }
      `}</style>
      <Calendar
        value={selectedDate}
        onChange={onDateChange}
        tileClassName={tileClassName}
        className="w-full"
      />
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-300"></div>
          <span className="text-gray-600">1-2 appointments</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-300 border-2 border-blue-500"></div>
          <span className="text-gray-600">3-5 appointments</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500 border-2 border-blue-700"></div>
          <span className="text-gray-600">6+ appointments</span>
        </div>
      </div>
    </div>
  );
};

