// Typed client for the Catalyst API. The access key (ADMIN_TOKEN) lives in sessionStorage,
// so closing the tab signs you out.

import type {
  ClassInfo, ClassInput, ClassesData, Contact, ConversationDetail, ConversationSummary, Faq, Language, Overview, Payment,
  PaymentsData, SettingsData, Slot, SubjectSetting, TutorProfile,
} from "./types";

const KEY = "catalyst.key";

export class AuthError extends Error {}

export const session = {
  get(): string | null {
    try { return sessionStorage.getItem(KEY); } catch { return null; }
  },
  set(key: string) {
    try { sessionStorage.setItem(KEY, key); } catch { /* private mode: key lives in memory only */ }
  },
  clear() {
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  },
};

let memoryKey: string | null = null;

async function request<T>(path: string, init: { method?: string; body?: unknown; key?: string } = {}): Promise<T> {
  const key = init.key ?? session.get() ?? memoryKey ?? "";
  const res = await fetch(`/admin/api${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError(data.error ?? "Wrong access key");
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

// A photo or PDF someone sent, as a Blob (an <img src> can't send the access key).
export async function fetchMedia(mediaId: string): Promise<Blob> {
  const key = session.get() ?? memoryKey ?? "";
  const res = await fetch(`/admin/api/media/${encodeURIComponent(mediaId)}`, { headers: { Authorization: `Bearer ${key}` } });
  if (res.status === 401) throw new AuthError("Wrong access key");
  if (!res.ok) throw new Error("This file wasn't saved.");
  return res.blob();
}

export async function signIn(key: string): Promise<Overview> {
  const overview = await request<Overview>("/overview", { key });
  memoryKey = key;
  session.set(key);
  return overview;
}

// Asks the server whether it needs an access key (it doesn't when ADMIN_TOKEN is unset).
export async function authRequired(): Promise<boolean> {
  try {
    const res = await fetch("/admin/api/auth");
    const data = await res.json();
    return data.required !== false;
  } catch {
    return true;
  }
}

export function signOut() {
  memoryKey = null;
  session.clear();
}

const wa = (waId: string) => `/conversations/${encodeURIComponent(waId)}`;

export const api = {
  overview: () => request<Overview>("/overview"),
  conversations: () => request<ConversationSummary[]>("/conversations"),
  conversation: (waId: string) => request<ConversationDetail>(wa(waId)),
  pause: (waId: string, reason?: string) => request<Contact>(`${wa(waId)}/pause`, { method: "POST", body: { reason } }),
  resume: (waId: string) => request<Contact>(`${wa(waId)}/resume`, { method: "POST", body: {} }),
  setLanguage: (waId: string, language: Language | "auto") =>
    request<Contact>(`${wa(waId)}/language`, { method: "POST", body: { language } }),
  reply: (waId: string, text: string) => request<{ ok: true; id: string }>(`${wa(waId)}/reply`, { method: "POST", body: { text } }),
  classes: () => request<ClassesData>("/classes"),
  payments: () => request<PaymentsData>("/payments"),
  approve: (id: number) => request<Payment>(`/payments/${id}/approve`, { method: "POST", body: {} }),
  reject: (id: number, reason: string) => request<Payment>(`/payments/${id}/reject`, { method: "POST", body: { reason } }),

  // Classes and sessions (what the bot offers)
  saveClass: (id: number | null, input: ClassInput) => request<ClassInfo>(id ? `/classes/${id}` : "/classes", { method: "POST", body: input }),
  setClassActive: (id: number, active: boolean) => request<ClassInfo>(`/classes/${id}/active`, { method: "POST", body: { active } }),
  cancelSession: (id: number, date: string, note: string) =>
    request(`/classes/${id}/sessions`, { method: "POST", body: { date, status: "cancelled", note } }),
  moveSession: (id: number, date: string, newDate: string, newTime: string, note: string) =>
    request(`/classes/${id}/sessions`, { method: "POST", body: { date, status: "rescheduled", new_date: newDate, new_time: newTime, note } }),
  restoreSession: (id: number, date: string) => request(`/classes/${id}/sessions/${date}/restore`, { method: "POST", body: {} }),

  // Settings
  settings: () => request<SettingsData>("/settings"),
  saveTutor: (t: Partial<TutorProfile>) => request<TutorProfile>("/settings/tutor", { method: "POST", body: t }),
  saveSubject: (id: number | null, s: { name: string; level: string; hourly_rate: string }) =>
    request<SubjectSetting>(id ? `/subjects/${id}` : "/subjects", { method: "POST", body: s }),
  deleteSubject: (id: number) => request(`/subjects/${id}/delete`, { method: "POST", body: {} }),
  addSlot: (s: { day_of_week: number; start_time: string; end_time: string }) => request<Slot>("/availability", { method: "POST", body: s }),
  deleteSlot: (id: number) => request(`/availability/${id}/delete`, { method: "POST", body: {} }),
  saveFaq: (id: number | null, f: { question: string; answer: string }) =>
    request<Faq>(id ? `/faqs/${id}` : "/faqs", { method: "POST", body: f }),
  deleteFaq: (id: number) => request(`/faqs/${id}/delete`, { method: "POST", body: {} }),
};
