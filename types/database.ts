export type UserRole = 'customer' | 'admin';
export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PhotoType = 'before' | 'after';
export type ServiceCategory = 'taglio' | 'barba' | 'styling' | 'baby';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  hair_preferences: string | null;
  personal_notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Barber {
  id: string;
  name: string;
  role: string;
  image_url: string | null;
  bio: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
}

export interface BarberAvailability {
  id: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface BarberTimeOff {
  id: string;
  barber_id: string | null;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_at: string;
  barber?: { name: string } | null;
}

export interface Appointment {
  id: string;
  customer_id: string | null;
  barber_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  reminder_email_sent_at: string | null;
  reminder_whatsapp_sent_at: string | null;
  created_at: string;
  barber?: Barber;
  service?: Service;
}

export interface AppointmentPhoto {
  id: string;
  appointment_id: string;
  customer_id: string;
  photo_type: PhotoType;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export interface SiteContent {
  id: string;
  key: string;
  title: string | null;
  body: string | null;
  is_active: boolean;
}