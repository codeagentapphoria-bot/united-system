// Barrel — re-export all sections from the single libre-sakay admin module
export { DashboardSection } from './Dashboard';
export { FleetSection } from './Fleet';
export { BusesTab } from './BusesTab';
export { RoutesTab } from './RoutesTab';
export { DriversTab } from './DriversTab';
export { StopsTab } from './StopsTab';
export { RideLogsSection } from './RideLogsSection';
export { ApplicationsSection } from './ApplicationsSection';
export { AccessControlSection } from './AccessControlSection';

// Shared utilities (re-exported for use by tests or external consumers)
export { StatusBadge, LoadingRows, EmptyState, DONUT_COLORS, RIDE_STATUS_STYLES, SECTION_TITLES } from './shared';

// Types
export type {
  Bus,
  Route,
  Driver,
  Stop,
  RouteStopJunction,
  RideLog,
  FleetStats,
  FleetBus,
  DashboardStats,
  RidesTrendPoint,
  PaginatedResponse,
} from './types';
