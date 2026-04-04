import * as React from "react"
import ReactCalendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

import { cn } from "@/lib/utils"

import type { CalendarProps as ReactCalendarProps, TileClassNameFunc, TileDisabledFunc } from "react-calendar"

export interface CalendarProps extends Partial<Pick<ReactCalendarProps, 'maxDetail' | 'navigationLabel'>> {
  value?: Date | null
  onChange?: (value: Date | null) => void
  disabled?: TileDisabledFunc
  tileClassName?: TileClassNameFunc
  className?: string
  minDate?: Date
  maxDate?: Date
}

export const Calendar: React.FC<CalendarProps> = ({
  value,
  onChange,
  disabled,
  tileClassName,
  className,
  minDate,
  maxDate,
  maxDetail,
  navigationLabel,
  ...props
}) => {
  return (
    <div className={cn("react-calendar-wrapper w-full", className)}>
      <ReactCalendar
        value={value || undefined}
        onChange={(date) => {
          if (onChange) {
            onChange(Array.isArray(date) ? date[0] : (date as Date | null))
          }
        }}
        tileDisabled={disabled}
        tileClassName={tileClassName}
        minDate={minDate}
        maxDate={maxDate}
        maxDetail={maxDetail}
        navigationLabel={navigationLabel}
        className="border border-gray-200 rounded-lg p-4 w-full bg-white shadow-sm"
        {...props}
      />
      <style>{`
        .react-calendar-wrapper .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
          background: transparent;
        }
        .react-calendar__navigation {
          display: flex;
          height: 48px;
          margin-bottom: 1.5rem;
          align-items: center;
          justify-content: center;
        }
        .react-calendar__navigation button {
          min-width: 48px;
          min-height: 48px;
          background: transparent;
          font-size: 16px;
          font-weight: 500;
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          transition: all 0.2s;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: hsl(var(--primary));
          color: white;
          border-color: hsl(var(--border));
        }
        .react-calendar__navigation button[disabled] {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .react-calendar__navigation__label {
          font-weight: 600;
          font-size: 1rem;
          color: hsl(var(--foreground));
        }
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin-bottom: 0.5rem;
        }
        .react-calendar__month-view__weekdays__weekday {
          padding: 0.75em 0.5em;
          font-weight: 600;
        }
        .react-calendar__month-view__days {
        }
        .react-calendar__month-view__days__day {
          height: 48px;
        }
        .react-calendar__tile {
          max-width: 100%;
          padding: 12px;
          background: transparent;
          text-align: center;
          line-height: 1.5;
          font-size: 0.875rem;
          font-weight: 500;
          color: hsl(var(--foreground));
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: hsl(var(--primary));
          color: white;
          border-color: hsl(var(--border));
        }
        .react-calendar__tile--now {
          background-color: hsl(var(--primary-foreground));
          color: hsl(var(--accent-foreground));
          font-weight: 700;
          border-color: hsl(var(--primary));
        }
        .react-calendar__tile--active {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          font-weight: 600;
          border-color: hsl(var(--primary));
        }
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background-color: hsl(var(--primary));
          opacity: 0.9;
        }
        .react-calendar__tile--disabled {
          opacity: 0.4;
          cursor: not-allowed;
          color: hsl(var(--muted-foreground));
        }
        .react-calendar__tile--neighboringMonth {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }
      `}</style>
    </div>
  )
}
