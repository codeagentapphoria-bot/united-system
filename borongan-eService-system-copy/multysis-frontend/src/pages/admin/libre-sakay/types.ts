// Re-export shared types from the service — single source of truth
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
} from '@/services/api/libre-sakay.service';
