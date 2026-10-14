export type Language = "de" | "en" | "fr";

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type CourseTranslation = {
  title: string;
  short_description: string;
  long_description: string;
};

export type AdminCategory = {
  id: number;
  slug: string;
  name: string;
};

export type AdminCourse = {
  id: number;
  slug: string;
  category: number;
  category_slug: string;
  base_price_chf: string;
  duration_hours: string;
  is_active: boolean;
  order: number;
  translations: Partial<Record<Language, CourseTranslation>>;
};

export type AdminCoursePayload = {
  slug: string;
  category: number;
  base_price_chf: string;
  duration_hours: string;
  is_active: boolean;
  order?: number;
  translations: Partial<Record<Language, CourseTranslation>>;
};

export type AdminLocation = {
  id: number;
  slug: string;
  name: string;
  city: string;
};

export type AdminSession = {
  id: number;
  course: number;
  course_slug: string;
  course_title: string;
  location: number;
  location_name: string;
  location_slug: string;
  start_datetime: string;
  end_datetime: string;
  max_participants: number;
  price_chf: string;
  status: "open" | "cancelled" | "closed";
  internal_notes: string;
  available_spots: number;
  confirmed_bookings_count: number;
};

export type AdminSessionPayload = {
  course: number;
  location: number;
  start_datetime: string;
  end_datetime: string;
  max_participants: number;
  price_chf: string;
  status?: "open" | "cancelled" | "closed";
  internal_notes?: string;
};

export type AdminBooking = {
  id: number;
  booking_number: string;
  session: number;
  session_label: string;
  course_title: string;
  start_datetime: string;
  location_name: string;
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  date_of_birth: string;
  license_date: string | null;
  voucher_code: string;
  notes: string;
  status: "confirmed" | "cancelled";
  language: Language;
  created_at: string;
};

export type DashboardStats = {
  upcoming_sessions: {
    id: number;
    course_title: string;
    start_datetime: string;
    location_name: string;
    available_spots: number;
    confirmed_bookings_count: number;
    max_participants: number;
  }[];
  recent_bookings: {
    id: number;
    booking_number: string;
    full_name: string;
    course_title: string;
    start_datetime: string;
    status: "confirmed" | "cancelled";
    created_at: string;
  }[];
  totals: {
    courses: number;
    upcoming_sessions: number;
    bookings_last_7_days: number;
    confirmed_bookings: number;
  };
};
