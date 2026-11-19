// Shapes returned by the engine's dashboard API (admin/api.js). Kept by hand in step with db/index.js.

export type Language = "en" | "si" | "ta" | "singlish" | "tanglish";

export interface Contact {
  id: number;
  wa_id: string;
  name: string | null;
  kind: "parent" | "student" | null;
  language: Language;
  /** 1 = follows what they write (detected); 0 = fixed from the dashboard. */
  language_auto?: 0 | 1;
  /** 1 = handed over: the bot stays quiet until someone hands the chat back. */
  bot_paused: 0 | 1;
  paused_reason: string | null;
  paused_at: string | null;
  created_at?: string;
}

/** GET /conversations: one row per contact, newest message first. */
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
  /** text, image, document, audio, ... */
  type: string;
  /** Text, or the caption of a photo/PDF. */
  body: string | null;
  created_at: string;
  /** Outgoing only; null for incoming and older rows. */
  status: "sent" | "failed" | "not_sent" | null;
  error: string | null;
  /** JSON array of { name, ok, error? }: the tools the bot used for this reply. */
  tools: string | null;
  /** Set when this is the fallback reply because the agent failed. */
  agent_error: string | null;
  /** Outgoing: who wrote it. "teacher" = sent from this dashboard. */
  sent_by: "bot" | "teacher" | null;
  media_id: string | null;
  media_mime: string | null;
  media_file: string | null;
}

/** GET /conversations/:wa_id. students and payments are the tutor data; not shown yet. */
export interface ConversationDetail {
  contact: Contact;
  students: unknown[];
  payments: unknown[];
  owed: number;
  messages: Message[];
}

export interface Tutor {
  name: string;
  timezone?: string;
  currency?: string;
}

/** GET /overview. Message counts cover the last 24 hours. */
export interface Overview {
  tutor: Tutor | null;
  counts: {
    contacts: number;
    students: number;
    active_enrollments: number;
    paused: number;
    messages_in_24h: number;
    messages_out_24h: number;
    undelivered_24h: number;
    agent_errors_24h: number;
    slips_waiting: number;
    owed_total: number;
    languages: { language: Language; n: number }[];
  };
  paused: ConversationSummary[];
}

/** The business profile the bot answers from (the engine's `tutor` row). */
export interface BusinessProfile {
  name: string;
  bio: string | null;
  qualifications: string | null;
  payment_instructions: string | null;
  currency?: string;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
}

/** GET /settings (subjects and availability are tutor data; not shown yet). */
export interface SettingsData {
  tutor: BusinessProfile | null;
  faqs: Faq[];
}
