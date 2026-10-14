/**
 * API-Typen entsprechen 1:1 den DRF-Serializern unter apps/backend/courses/serializers.py.
 * Bei Backend-Änderungen hier nachziehen.
 */

export type CategoryNested = {
  slug: string;
  name: string;
};

export type Category = CategoryNested & {
  id: number;
  order: number;
};

export type LocationNested = {
  slug: string;
  name: string;
  city: string;
};

export type CourseListItem = {
  id: number;
  slug: string;
  category: CategoryNested;
  title: string;
  short_description: string;
  base_price_chf: string;
  duration_hours: string;
  image_url: string | null;
  next_session_date: string | null;
};

export type CourseDetail = CourseListItem & {
  long_description: string;
};

export type SessionItem = {
  id: number;
  start_datetime: string;
  end_datetime: string;
  location: LocationNested;
  price_chf: string;
  max_participants: number;
  available_spots: number;
  is_bookable: boolean;
  status: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type BookingCreatePayload = {
  session_id: number;
  salutation: "mr" | "mrs" | "div";
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  date_of_birth: string;
  license_date?: string | null;
  voucher_code?: string;
  notes?: string;
  language: string;
  accept_terms: boolean;
};

export type BookingSessionNested = {
  id: number;
  course_title: string;
  start_datetime: string;
  end_datetime: string;
  location_name: string;
};

export type BookingResponse = {
  booking_number: string;
  session: BookingSessionNested;
  status: "confirmed" | "cancelled";
  created_at: string;
};

export type BookingErrorBody = {
  error?: "session_full" | "session_not_open" | "terms_not_accepted";
  message?: string;
  available_spots?: number;
  field_errors?: Record<string, string[]>;
};
