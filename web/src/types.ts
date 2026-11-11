// Shapes returned by the Catalyst API (admin/api.js). Kept by hand in step with db/index.js.

export type Language = "en" | "si" | "ta" | "singlish" | "tanglish";
export const LANGUAGES: Language[] = ["en", "si", "ta", "singlish", "tanglish"];

export interface Contact {
  id: number;
  wa_id: string;
  name: string | null;
  kind: "parent" | "student" | null;
  language: Language;
  bot_paused: 0 | 1;
  paused_reason: string | null;
  paused_at: string | null;
  created_at?: string;
}

export interface ConversationSummary extends Contact {
  student_count: number;
  message_count: number;
  last_body: string | null;
  last_type: string | null;
  last_direction: "in" | "out" | null;
  last_at: string | null;
}

export interface Message {
  id: string;
  direction: "in" | "out";
  type: string;
  body: string | null;
  created_at: string;
}

export interface Enrollment {
  class_id: number;
  title: string;
  status: "pending" | "active" | "paused" | "cancelled" | string;
  day_name: string;
  start_time: string;
  mode: "online" | "physical";
  monthly_fee: number;
}

export interface Trial { id: number; class_title: string; date: string; status: string }
export interface Booking { id: number; subject_name: string; starts_at: string; status: string; topic: string | null }

export interface Student {
  id: number;
  name: string;
  grade: string | null;
  school: string | null;
  enrollments: Enrollment[];
  trials: Trial[];
  bookings: Booking[];
}

export interface Payment {
  id: number;
  student_id: number;
  student_name: string;
  class_title: string;
  contact_id: number;
  month: string;
  amount: number;
  status: "due" | "slip_received" | "approved" | "rejected" | "waived";
  slip_media_id: string | null;
  slip_reference: string | null;
  slip_received_at: string | null;
  review_note: string | null;
}

export interface ConversationDetail {
  contact: Contact;
  students: Student[];
  payments: Payment[];
  owed: number;
  messages: Message[];
}

export interface Session {
  class_id: number;
  title: string;
  subject_name: string;
  mode: "online" | "physical";
  location: string | null;
  duration_minutes: number;
  date: string;
  time: string;
  status: "scheduled" | "cancelled" | "rescheduled";
  note: string | null;
  original_date?: string;
}

export interface ClassInfo {
  id: number;
  title: string;
  subject_name: string;
  subject_level: string;
  class_type: "theory" | "revision" | "paper";
  mode: "online" | "physical";
  location: string | null;
  day_name: string;
  start_time: string;
  duration_minutes: number;
  monthly_fee: number;
  capacity: number | null;
  enrolled_count: number;
  seats_left: number | null;
}

export interface Tutor { name: string; timezone: string; currency: string }

export interface Overview {
  tutor: Tutor | null;
  counts: {
    contacts: number;
    students: number;
    active_enrollments: number;
    paused: number;
    messages_in_24h: number;
    messages_out_24h: number;
    slips_waiting: number;
    owed_total: number;
    languages: { language: Language; n: number }[];
  };
  sessions: Session[];
  paused: ConversationSummary[];
  slips: Payment[];
}

export interface OwedRow { contact_id: number; wa_id: string; name: string | null; total: number; items: number }
export interface PaymentsData { slips: Payment[]; owed: OwedRow[] }
export interface ClassesData { classes: ClassInfo[]; sessions: Session[] }
