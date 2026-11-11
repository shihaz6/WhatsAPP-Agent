// Display helpers. Dates in the database are UTC ("2026-11-11T07:49:26Z"); class dates and
// times are already the tutor's local time ("2026-11-14", "08:00").

import type { Language } from "./types";

export const TZ = "Asia/Colombo";

export const LANGUAGE_INFO: Record<Language, { label: string; native: string; hint: string }> = {
  en: { label: "English", native: "English", hint: "English" },
  si: { label: "Sinhala", native: "සිංහල", hint: "Sinhala script" },
  ta: { label: "Tamil", native: "தமிழ்", hint: "Tamil script" },
  singlish: { label: "Singlish", native: "Singlish", hint: "Sinhala in English letters" },
  tanglish: { label: "Tanglish", native: "Tanglish", hint: "Tamil in English letters" },
};

export function money(amount: number, currency = "LKR") {
  return `${currency} ${new Intl.NumberFormat("en-LK").format(amount)}`;
}

const parseUtc = (iso: string) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`);

export function clock(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(parseUtc(iso));
}

export function dayLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(parseUtc(iso));
}

export function ago(iso: string | null, now = Date.now()) {
  if (!iso) return "";
  const s = Math.max(0, Math.round((now - parseUtc(iso).getTime()) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return dayLabel(iso);
}

// "2026-11-14" -> "Sat 14 Nov"
export function classDate(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(d);
}

export function todayInTz() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function displayName(c: { name: string | null; wa_id: string }) {
  return c.name ?? `+${c.wa_id}`;
}

export function initials(c: { name: string | null; wa_id: string }) {
  if (!c.name) return "#";
  const words = c.name.replace(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+/i, "").replace(/\b[A-Z]\.\s*/g, "").trim().split(/\s+/);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

const PLACEHOLDER: Record<string, string> = {
  image: "📷 Photo", audio: "🎤 Voice message", video: "🎬 Video", document: "📄 Document",
  sticker: "Sticker", location: "📍 Location",
};
export const messageText = (type: string | null, body: string | null) => body ?? PLACEHOLDER[type ?? ""] ?? `[${type}]`;
