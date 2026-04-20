import api from './auth.service';
import { supabase } from '@/lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface Bus {
  id: string;
  plate_number: string;
  model: string | null;
  capacity: number;
  is_active: boolean;
  route_id: string | null;
  created_at: string;
  updated_at: string;
  routes: { id: string; name: string } | null;
  driver_buses?: Array<{
    id: string;
    profiles: { id: string; full_name: string; phone: string | null };
  }>;
}

export interface Route {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  route_stops: Array<{ count: number }>;
}

export interface Driver {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  driver_buses: Array<{
    id: string;
    buses: { id: string; plate_number: string };
  }>;
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface RouteStopJunction {
  id: string; // route_stops junction PK
  stop_id: string; // FK to stops
  sequence_order: number;
  stops: { id: string; name: string; latitude: number; longitude: number };
}

export interface FleetStats {
  total: number;
  moving: number;
  parked: number;
}

export interface FleetBus {
  bus_id: string;
  plate_number: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: 'moving' | 'parked';
  route_name: string | null;
  driver_name: string | null;
  barangay_name: string | null;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =============================================================================
// API SERVICE
// =============================================================================

const BASE = '/libre-sakay';

export const libreSakayService = {
  // Fleet
  async getFleetStats(): Promise<FleetStats> {
    const response = await api.get(`${BASE}/fleet/stats`);
    return response.data.data;
  },

  async getFleetLocations(): Promise<FleetBus[]> {
    const { data, error } = await supabase.rpc('get_fleet_data');
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      bus_id: row.bus_id as string,
      plate_number: row.plate_number as string,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      speed: row.speed as number,
      heading: row.heading as number,
      status: ((row.speed as number) > 5 ? 'moving' : 'parked') as 'moving' | 'parked',
      route_name: row.route_name as string | null,
      driver_name: row.driver_name as string | null,
      barangay_name: row.barangay_name as string | null,
      updated_at: row.updated_at as string,
    }));
  },

  // Buses
  async getBuses(page = 1, limit = 20): Promise<PaginatedResponse<Bus>> {
    const response = await api.get(`${BASE}/buses`, { params: { page, limit } });
    return { data: response.data.data, pagination: response.data.pagination };
  },

  async getBusById(id: string): Promise<Bus> {
    const response = await api.get(`${BASE}/buses/${id}`);
    return response.data.data;
  },

  async getAvailableRoutes(): Promise<{ id: string; name: string }[]> {
    const response = await api.get(`${BASE}/buses/available/routes`);
    return response.data.data;
  },

  async getAvailableDrivers(): Promise<{ id: string; full_name: string; phone: string | null }[]> {
    const response = await api.get(`${BASE}/buses/available/drivers`);
    return response.data.data;
  },

  async createBus(data: { plate_number: string; capacity: number; route_id?: string }): Promise<Bus> {
    const response = await api.post(`${BASE}/buses`, data);
    return response.data.data;
  },

  async updateBus(id: string, data: Partial<{ plate_number: string; capacity: number; route_id: string | null; is_active: boolean }>): Promise<Bus> {
    const response = await api.patch(`${BASE}/buses/${id}`, data);
    return response.data.data;
  },

  async deleteBus(id: string): Promise<void> {
    await api.delete(`${BASE}/buses/${id}`);
  },

  async assignDriverToBus(busId: string, driverId: string): Promise<void> {
    await api.post(`${BASE}/buses/${busId}/drivers`, { driver_id: driverId });
  },

  async unassignDriverFromBus(busId: string, driverId: string): Promise<void> {
    await api.delete(`${BASE}/buses/${busId}/drivers`, { data: { driver_id: driverId } });
  },

  // Routes
  async getRoutes(page = 1, limit = 20): Promise<PaginatedResponse<Route>> {
    const response = await api.get(`${BASE}/routes`, { params: { page, limit } });
    return { data: response.data.data, pagination: response.data.pagination };
  },

  async getRouteById(id: string): Promise<Route> {
    const response = await api.get(`${BASE}/routes/${id}`);
    return response.data.data;
  },

  async getRouteStops(routeId: string): Promise<RouteStopJunction[]> {
    const response = await api.get(`${BASE}/routes/${routeId}/stops`);
    return response.data.data;
  },

  async createRoute(data: { name: string; description?: string }): Promise<Route> {
    const response = await api.post(`${BASE}/routes`, data);
    return response.data.data;
  },

  async updateRoute(id: string, data: Partial<{ name: string; description: string; is_active: boolean }>): Promise<Route> {
    const response = await api.patch(`${BASE}/routes/${id}`, data);
    return response.data.data;
  },

  async deleteRoute(id: string): Promise<void> {
    await api.delete(`${BASE}/routes/${id}`);
  },

  // Drivers
  async getDrivers(page = 1, limit = 20): Promise<PaginatedResponse<Driver>> {
    const response = await api.get(`${BASE}/drivers`, { params: { page, limit } });
    return { data: response.data.data, pagination: response.data.pagination };
  },

  async getDriverById(id: string): Promise<Driver> {
    const response = await api.get(`${BASE}/drivers/${id}`);
    return response.data.data;
  },

  async createDriver(data: { email: string; full_name: string; phone: string; password: string }): Promise<any> {
    const response = await api.post(`${BASE}/drivers`, data);
    return response.data.data;
  },

  async updateDriver(id: string, data: Partial<{ full_name: string; phone: string; is_active: boolean }>): Promise<Driver> {
    const response = await api.patch(`${BASE}/drivers/${id}`, data);
    return response.data.data;
  },

  async deleteDriver(id: string): Promise<void> {
    await api.delete(`${BASE}/drivers/${id}`);
  },

  async assignBusToDriver(driverId: string, busId: string): Promise<void> {
    await api.post(`${BASE}/drivers/${driverId}/buses`, { bus_id: busId });
  },

  async unassignBusFromDriver(driverId: string, busId: string): Promise<void> {
    await api.delete(`${BASE}/drivers/${driverId}/buses`, { data: { bus_id: busId } });
  },

  // Stops
  async getAllStops(): Promise<Stop[]> {
    const response = await api.get(`${BASE}/stops`);
    return response.data.data;
  },

  async createStop(data: { name: string; latitude: number; longitude: number }): Promise<Stop> {
    const response = await api.post(`${BASE}/stops`, data);
    return response.data.data;
  },

  async updateStop(id: string, data: Partial<{ name: string; latitude: number; longitude: number }>): Promise<Stop> {
    const response = await api.patch(`${BASE}/stops/${id}`, data);
    return response.data.data;
  },

  async deleteStop(id: string): Promise<void> {
    await api.delete(`${BASE}/stops/${id}`);
  },

  async assignStopToRoute(routeId: string, stopId: string): Promise<void> {
    await api.post(`${BASE}/routes/${routeId}/stops`, { stop_id: stopId });
  },

  async removeStopFromRoute(routeId: string, stopId: string): Promise<void> {
    await api.delete(`${BASE}/routes/${routeId}/stops`, { data: { stop_id: stopId } });
  },

  async reorderStopsInRoute(routeId: string, stopIds: string[]): Promise<void> {
    await api.patch(`${BASE}/routes/${routeId}/stops/reorder`, { stop_ids: stopIds });
  },
};