import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types/announcement';

export const announcementService = {
  async getActive(): Promise<Announcement[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
};
