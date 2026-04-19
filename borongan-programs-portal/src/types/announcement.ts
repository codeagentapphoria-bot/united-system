export type AnnouncementType = 'info' | 'warning' | 'alert' | 'success';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}
