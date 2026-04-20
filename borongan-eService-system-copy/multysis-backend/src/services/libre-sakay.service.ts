import { getLibreSakaySupabase } from '../config/libre-sakay-supabase';

// =============================================================================
// HELPERS
// =============================================================================

const supabase = () => getLibreSakaySupabase();

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
  driver_buses: Array<{
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
  driver_buses: Array<{ id: string; buses: { id: string; plate_number: string } }>;
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface FleetStats {
  total: number;
  moving: number;
  parked: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// FLEET STATS (read-only)
// =============================================================================

export const getFleetStats = async (): Promise<FleetStats> => {
  const { data, error } = await supabase()
    .from('bus_locations')
    .select('speed, bus_id')
    .order('recorded_at', { ascending: false });

  if (error) throw new Error('Failed to fetch fleet stats: ' + error.message);

  // Deduplicate by bus_id (latest record first), then classify
  const seen = new Set<string>();
  const buses: Array<{ bus_id: string; speed: number }> = [];
  for (const row of data ?? []) {
    if (!seen.has(row.bus_id)) {
      seen.add(row.bus_id);
      buses.push({ bus_id: row.bus_id, speed: row.speed ?? 0 });
    }
  }

  const moving = buses.filter(b => b.speed > 5).length;

  return {
    total: buses.length,
    moving,
    parked: buses.length - moving,
  };
};

// =============================================================================
// BUSES
// =============================================================================

export const getBuses = async (page = 1, limit = 20): Promise<PaginatedResult<Bus>> => {
  const from = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    supabase()
      .from('buses')
      .select('*, routes(id, name), driver_buses(id, profiles(id, full_name, phone))', { count: 'exact' })
      .order('plate_number')
      .range(from, from + limit - 1),
    supabase().from('buses').select('id', { count: 'exact', head: true }),
  ]);

  if (dataResult.error) throw new Error('Failed to fetch buses: ' + dataResult.error.message);

  return {
    data: dataResult.data ?? [],
    total: countResult.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult.count ?? 0) / limit),
  };
};

export const getBusById = async (id: string): Promise<Bus | null> => {
  const { data, error } = await supabase()
    .from('buses')
    .select('*, routes(id, name), driver_buses(id, profiles(id, full_name, phone))')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error('Failed to fetch bus: ' + error.message);
  return data;
};

export const getAvailableRoutes = async () => {
  const { data, error } = await supabase().from('routes').select('id, name').eq('is_active', true).order('name');
  if (error) throw new Error('Failed to fetch routes: ' + error.message);
  return data;
};

export const getAvailableDrivers = async () => {
  // All drivers (not just unassigned — frontend filters)
  const { data, error } = await supabase()
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'driver')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw new Error('Failed to fetch drivers: ' + error.message);
  return data;
};

export const createBus = async (plate_number: string, capacity: number, route_id?: string) => {
  const { data, error } = await supabase()
    .from('buses')
    .insert({ plate_number, capacity, is_active: true, ...(route_id ? { route_id } : {}) })
    .select()
    .single();

  if (error) throw new Error('Failed to create bus: ' + error.message);
  return data;
};

export const updateBus = async (
  id: string,
  updates: { plate_number?: string; capacity?: number; route_id?: string | null; is_active?: boolean }
) => {
  const { data, error } = await supabase()
    .from('buses')
    .update(updates)
    .eq('id', id)
    .select('*, routes(id, name), driver_buses(id, profiles(id, full_name, phone))')
    .single();

  if (error) throw new Error('Failed to update bus: ' + error.message);
  return data;
};

export const deleteBus = async (id: string) => {
  const { error } = await supabase().from('buses').delete().eq('id', id);
  if (error) throw new Error('Failed to delete bus: ' + error.message);
};

export const assignDriverToBus = async (busId: string, driverId: string) => {
  const { error } = await supabase()
    .from('driver_buses')
    .insert({ bus_id: busId, driver_id: driverId });
  if (error) throw new Error('Failed to assign driver: ' + error.message);
};

export const unassignDriverFromBus = async (busId: string, driverId: string) => {
  const { error } = await supabase()
    .from('driver_buses')
    .delete()
    .eq('bus_id', busId)
    .eq('driver_id', driverId);
  if (error) throw new Error('Failed to unassign driver: ' + error.message);
};

// =============================================================================
// ROUTES
// =============================================================================

export const getRoutes = async (page = 1, limit = 20): Promise<PaginatedResult<Route>> => {
  const from = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    supabase()
      .from('routes')
      .select('*, route_stops(count)', { count: 'exact' })
      .order('name')
      .range(from, from + limit - 1),
    supabase().from('routes').select('id', { count: 'exact', head: true }),
  ]);

  if (dataResult.error) throw new Error('Failed to fetch routes: ' + dataResult.error.message);

  return {
    data: dataResult.data ?? [],
    total: countResult.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult.count ?? 0) / limit),
  };
};

export const getRouteById = async (id: string) => {
  const { data, error } = await supabase().from('routes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Failed to fetch route: ' + error.message);
  return data;
};

export const getRouteWithStops = async (id: string) => {
  const { data, error } = await supabase()
    .from('routes')
    .select('*, stops(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Failed to fetch route with stops: ' + error.message);
  return data;
};

export const createRoute = async (name: string, description?: string) => {
  const { data, error } = await supabase()
    .from('routes')
    .insert({ name, description, is_active: true })
    .select()
    .single();
  if (error) throw new Error('Failed to create route: ' + error.message);
  return data;
};

export const updateRoute = async (id: string, updates: { name?: string; description?: string; is_active?: boolean }) => {
  const { data, error } = await supabase().from('routes').update(updates).eq('id', id).select().single();
  if (error) throw new Error('Failed to update route: ' + error.message);
  return data;
};

export const deleteRoute = async (id: string) => {
  const { error } = await supabase().from('routes').delete().eq('id', id);
  if (error) throw new Error('Failed to delete route: ' + error.message);
};

// =============================================================================
// DRIVERS (profiles with role=driver)
// =============================================================================

export const getDrivers = async (page = 1, limit = 20): Promise<PaginatedResult<Driver>> => {
  const from = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    supabase()
      .from('profiles')
      .select('*, driver_buses(buses(id, plate_number))', { count: 'exact' })
      .eq('role', 'driver')
      .order('full_name')
      .range(from, from + limit - 1),
    supabase().from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
  ]);

  if (dataResult.error) throw new Error('Failed to fetch drivers: ' + dataResult.error.message);

  return {
    data: dataResult.data ?? [],
    total: countResult.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult.count ?? 0) / limit),
  };
};

export const getDriverById = async (id: string) => {
  const { data, error } = await supabase()
    .from('profiles')
    .select('*, driver_buses(buses(id, plate_number))')
    .eq('id', id)
    .eq('role', 'driver')
    .maybeSingle();
  if (error) throw new Error('Failed to fetch driver: ' + error.message);
  return data;
};

export const createDriver = async (email: string, full_name: string, phone: string, password: string) => {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase().auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name, role: 'driver' },
  });
  if (authError || !authData.user) throw new Error('Failed to create auth user: ' + (authError?.message ?? 'unknown'));

  // 2. Update profile
  const { error: profileError } = await supabase()
    .from('profiles')
    .update({ full_name, phone, role: 'driver', is_active: true })
    .eq('id', authData.user.id);
  if (profileError) throw new Error('Failed to update profile: ' + profileError.message);

  return authData.user;
};

export const updateDriver = async (
  id: string,
  updates: { full_name?: string; phone?: string; is_active?: boolean }
) => {
  const { data, error } = await supabase()
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('*, driver_buses(buses(id, plate_number))')
    .single();
  if (error) throw new Error('Failed to update driver: ' + error.message);
  return data;
};

export const deleteDriver = async (id: string) => {
  // Soft delete — set is_active = false
  const { error } = await supabase().from('profiles').update({ is_active: false }).eq('id', id);
  if (error) throw new Error('Failed to delete driver: ' + error.message);
};

export const assignBusToDriver = async (driverId: string, busId: string) => {
  const { error } = await supabase().from('driver_buses').insert({ driver_id: driverId, bus_id: busId });
  if (error) throw new Error('Failed to assign bus: ' + error.message);
};

export const unassignBusFromDriver = async (driverId: string, busId: string) => {
  const { error } = await supabase()
    .from('driver_buses')
    .delete()
    .eq('driver_id', driverId)
    .eq('bus_id', busId);
  if (error) throw new Error('Failed to unassign bus: ' + error.message);
};

// =============================================================================
// STOPS
// =============================================================================

export const getAllStops = async () => {
  const { data, error } = await supabase()
    .from('stops')
    .select('id, name, latitude, longitude')
    .order('name');
  if (error) throw new Error('Failed to fetch stops: ' + error.message);
  return data;
};

export const getStopsByRoute = async (routeId: string) => {
  const { data, error } = await supabase()
    .from('route_stops')
    .select('id, stop_id, stops(id, name, latitude, longitude), sequence_order')
    .eq('route_id', routeId)
    .order('sequence_order');
  if (error) throw new Error('Failed to fetch route stops: ' + error.message);
  return data ?? [];
};

export const createStop = async (name: string, latitude: number, longitude: number) => {
  const { data, error } = await supabase()
    .from('stops')
    .insert({ name, latitude, longitude })
    .select()
    .single();
  if (error) throw new Error('Failed to create stop: ' + error.message);
  return data;
};

export const updateStop = async (
  id: string,
  updates: { name?: string; latitude?: number; longitude?: number }
) => {
  const { data, error } = await supabase().from('stops').update(updates).eq('id', id).select().single();
  if (error) throw new Error('Failed to update stop: ' + error.message);
  return data;
};

export const deleteStop = async (id: string) => {
  const { error } = await supabase().from('stops').delete().eq('id', id);
  if (error) throw new Error('Failed to delete stop: ' + error.message);
};

export const assignStopToRoute = async (routeId: string, stopId: string) => {
  // Get next sequence_order
  const { data: existing, error: fetchError } = await supabase()
    .from('route_stops')
    .select('sequence_order')
    .eq('route_id', routeId)
    .order('sequence_order', { ascending: false })
    .limit(1);

  if (fetchError) throw new Error('Failed to get route stops: ' + fetchError.message);
  const nextOrder = existing?.length ? (existing[0].sequence_order ?? 0) + 1 : 1;

  const { error } = await supabase()
    .from('route_stops')
    .insert({ route_id: routeId, stop_id: stopId, sequence_order: nextOrder });
  if (error) throw new Error('Failed to assign stop to route: ' + error.message);
};

export const removeStopFromRoute = async (routeId: string, stopId: string) => {
  const { error } = await supabase()
    .from('route_stops')
    .delete()
    .eq('route_id', routeId)
    .eq('stop_id', stopId);
  if (error) throw new Error('Failed to remove stop from route: ' + error.message);
};

export const reorderStopsInRoute = async (routeId: string, stopIds: string[]) => {
  // Two-pass update to avoid unique constraint conflicts
  // Step 1: Set all to 0
  for (const stopId of stopIds) {
    const { error } = await supabase()
      .from('route_stops')
      .update({ sequence_order: 0 })
      .eq('route_id', routeId)
      .eq('stop_id', stopId);
    if (error) throw new Error('Failed to reorder stops: ' + error.message);
  }
  // Step 2: Set to final values
  for (let i = 0; i < stopIds.length; i++) {
    const { error } = await supabase()
      .from('route_stops')
      .update({ sequence_order: i + 1 })
      .eq('route_id', routeId)
      .eq('stop_id', stopIds[i]);
    if (error) throw new Error('Failed to reorder stops: ' + error.message);
  }
};

// =============================================================================
// DASHBOARD STATS
// =============================================================================

export const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [busCount, routeCount, driverCount, ridesToday, ridesWeek] = await Promise.all([
    supabase().from('buses').select('id', { count: 'exact', head: true }),
    supabase().from('routes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase().from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
    supabase()
      .from('ride_logs')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', today.toISOString()),
    supabase()
      .from('ride_logs')
      .select('id, passenger_count')
      .gte('started_at', new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const ridesThisWeek = ridesWeek.data?.length ?? 0;
  const passengersThisWeek = ridesWeek.data?.reduce((sum, r) => sum + (r.passenger_count ?? 0), 0) ?? 0;

  return {
    total_buses: busCount.count ?? 0,
    active_routes: routeCount.count ?? 0,
    total_drivers: driverCount.count ?? 0,
    rides_today: ridesToday.count ?? 0,
    rides_this_week: ridesThisWeek,
    passengers_this_week: passengersThisWeek,
    avg_passengers_per_ride: ridesThisWeek > 0 ? Math.round((passengersThisWeek / ridesThisWeek) * 10) / 10 : 0,
  };
};

// =============================================================================
// RIDE LOGS
// =============================================================================

export interface RideLogFilters {
  from?: string;
  to?: string;
  route_id?: string;
  driver_id?: string;
  bus_id?: string;
}

export const getRideLogs = async (page = 1, limit = 20, filters: RideLogFilters = {}): Promise<PaginatedResult<any>> => {
  const from = (page - 1) * limit;

  let query = supabase()
    .from('ride_logs')
    .select('id, bus_id, route_id, driver_id, started_at, ended_at, passenger_count, status, notes, created_at, buses(plate_number), routes(name), driver:profiles(full_name)', { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(from, from + limit - 1);

  if (filters.from) query = query.gte('started_at', filters.from);
  if (filters.to) query = query.lte('started_at', filters.to + 'T23:59:59');
  if (filters.route_id) query = query.eq('route_id', filters.route_id);
  if (filters.driver_id) query = query.eq('driver_id', filters.driver_id);
  if (filters.bus_id) query = query.eq('bus_id', filters.bus_id);

  const { data, error, count } = await query;
  if (error) throw new Error('Failed to fetch ride logs: ' + error.message);

  return { data: data ?? [], total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) };
};

export const getRidesTrend = async (days = 7): Promise<{ date: string; rides: number; passengers: number }[]> => {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase()
    .from('ride_logs')
    .select('started_at, passenger_count')
    .gte('started_at', since.toISOString());

  if (error) throw new Error('Failed to fetch rides trend: ' + error.message);

  const byDay: Record<string, { rides: number; passengers: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDay[d.toISOString().slice(0, 10)] = { rides: 0, passengers: 0 };
  }

  for (const row of data ?? []) {
    const day = (row.started_at as string).slice(0, 10);
    if (byDay[day]) {
      byDay[day].rides++;
      byDay[day].passengers += row.passenger_count ?? 0;
    }
  }

  return Object.entries(byDay).map(([date, v]) => ({ date, ...v }));
};

export const deleteRideLog = async (id: string): Promise<void> => {
  const { error } = await supabase().from('ride_logs').delete().eq('id', id);
  if (error) throw new Error('Failed to delete ride log: ' + error.message);
};
