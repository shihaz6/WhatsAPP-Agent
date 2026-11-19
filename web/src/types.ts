// Shapes returned by the engine's dashboard API (admin/api.js). Kept by hand in step with
// db/schema.sql and db/index.js.

export type Language = "en" | "si" | "ta" | "singlish" | "tanglish";
/** The reply-language switches: Sinhala covers Singlish, Tamil covers Tanglish. */
export type ReplyLanguageCode = "si" | "ta" | "en";
type Flag = 0 | 1;

export interface Contact {
  id: number;
  wa_id: string;
  name: string | null;
  language: Language;
  /** 1 = follows what they write (detected); 0 = fixed from the dashboard. */
  language_auto: Flag;
  /** 1 = handed over: the bot stays quiet until someone hands the chat back. */
  bot_paused: Flag;
  paused_reason: string | null;
  paused_at: string | null;
  created_at: string;
}

/** GET /conversations: one row per contact, newest message first. */
export interface ConversationSummary extends Contact {
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
  /** Outgoing only. */
  status: "sent" | "failed" | "not_sent" | null;
  error: string | null;
  /** JSON array of { name, ok, error? }: the tools the bot used for this reply. */
  tools: string | null;
  /** Set when this is the fallback reply because the AI failed. */
  agent_error: string | null;
  /** Outgoing: who wrote it. "owner" = sent from this dashboard. */
  sent_by: "bot" | "owner" | null;
  media_id: string | null;
  media_mime: string | null;
  media_file: string | null;
}

export interface ConversationDetail {
  contact: Contact;
  messages: Message[];
}

/** The business the bot works for (Bot settings > Business information, Handover). */
export interface Business {
  name: string;
  owner_name: string | null;
  opening_hours: string | null;
  location: string | null;
  payment_details: string | null;
  delivery_info: string | null;
  /** Digits with the country code, e.g. "94771234567". */
  handover_number: string | null;
  /** 0 = the bot is silent for everyone. */
  bot_enabled: Flag;
  currency: string;
  timezone: string;
  product_sheet_url: string | null;
  products_synced_at: string | null;
  updated_at: string;
}

/** GET /overview. Message counts cover the last 24 hours. */
export interface Overview {
  business: Business;
  counts: {
    contacts: number;
    paused: number;
    messages_in_24h: number;
    messages_out_24h: number;
    undelivered_24h: number;
    agent_errors_24h: number;
    products: number;
    out_of_stock: number;
    faqs: number;
    languages: { language: Language; n: number }[];
  };
  paused: ConversationSummary[];
}

export interface Product {
  id: number;
  name: string;
  /** Whole units of business.currency. */
  price: number;
  /** null = stock isn't tracked. */
  stock: number | null;
  category: string | null;
  description: string | null;
  /** 0 = hidden from the bot. */
  active: Flag;
  created_at: string;
  updated_at: string;
}

/** What the product form and the CSV import send. The server parses "Rs 1,250" etc. */
export interface ProductInput {
  name: string;
  price: string | number;
  stock?: string | number | null;
  category?: string | null;
  description?: string | null;
  active?: boolean;
}

export interface ImportResult {
  ok: boolean;
  total: number;
  created: number;
  updated: number;
  errors: { row: number; error: string }[];
}

export interface ReplyLanguage {
  code: ReplyLanguageCode;
  enabled: Flag;
}

export interface HandoverRule {
  key: string;
  label: string;
  enabled: Flag;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
}

/** GET /settings, and what POST /settings returns. */
export interface SettingsData {
  business: Business;
  languages: ReplyLanguage[];
  handover_rules: HandoverRule[];
  faqs: Faq[];
}

/** POST /settings: everything on the Bot settings page, saved together. */
export interface SettingsInput {
  business: Partial<Pick<Business, "name" | "owner_name" | "opening_hours" | "location" | "payment_details" | "delivery_info" | "handover_number">>;
  languages: Partial<Record<ReplyLanguageCode, boolean>>;
  handover_rules: { key: string; enabled: boolean }[];
}
