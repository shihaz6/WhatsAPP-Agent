// Typed client for the engine's dashboard API, served by server.js at /admin/api.
// In local dev, Vite proxies /admin/api to the engine (see vite.config.ts).
// When the server has ADMIN_TOKEN set, every call needs it; the key is kept in sessionStorage,
// so closing the tab signs you out.

import type {
  Business, Contact, ConversationDetail, ConversationSummary, Faq, ImportResult, Overview, Product, ProductInput,
  SettingsData, SettingsInput,
} from "./types";

const BASE = "/admin/api";
const KEY = "catalyst.key";

export class AuthError extends Error {}

let memoryKey: string | null = null;
const storedKey = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

// Called when the server rejects the key, so the app can show the sign-in screen.
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init: { method?: string; body?: unknown; key?: string } = {}): Promise<T> {
  const key = init.key ?? memoryKey ?? storedKey() ?? "";
  const res = await fetch(BASE + path, {
    method: init.method ?? "GET",
    headers: {
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    if (!init.key) onUnauthorized();
    throw new AuthError(data.error ?? "Wrong access key");
  }
  // The response body rides along on the error (the product import lists bad rows there).
  if (!res.ok) throw Object.assign(new Error(data.error ?? `Request failed (${res.status})`), { data });
  return data as T;
}

/** Whether the server wants an access key. Throws when the engine can't be reached. */
export async function authRequired(): Promise<boolean> {
  const res = await fetch(`${BASE}/auth`);
  if (!res.ok) throw new Error(`The engine answered ${res.status}`);
  const data = await res.json();
  return data.required !== false;
}

export function hasKey() {
  return Boolean(memoryKey ?? storedKey());
}

/** Checks the key against the server and keeps it for this tab. */
export async function signIn(key: string) {
  await request<Overview>("/overview", { key });
  memoryKey = key;
  try {
    sessionStorage.setItem(KEY, key);
  } catch {
    // Private mode: the key lives in memory until the tab closes.
  }
}

export function signOut() {
  memoryKey = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

const chat = (waId: string) => `/conversations/${encodeURIComponent(waId)}`;
const post = <T>(path: string, body: unknown = {}) => request<T>(path, { method: "POST", body });

export const api = {
  overview: () => request<Overview>("/overview"),

  // Conversations
  conversations: () => request<ConversationSummary[]>("/conversations"),
  conversation: (waId: string) => request<ConversationDetail>(chat(waId)),
  /** Take over: the bot stays quiet in this chat until it's handed back. */
  takeOver: (waId: string, reason = "Replying from Catalyst") => post<Contact>(`${chat(waId)}/pause`, { reason }),
  handBack: (waId: string) => post<Contact>(`${chat(waId)}/resume`),
  /** Sends a WhatsApp message from the business number. */
  reply: (waId: string, text: string) => post<{ ok: true; id: string }>(`${chat(waId)}/reply`, { text }),

  // Products (the bot uses changes from the next message)
  products: () => request<Product[]>("/products"),
  saveProduct: (id: number | null, product: ProductInput) => post<Product>(id ? `/products/${id}` : "/products", product),
  /** Several at once: "delete", or "show" / "hide" from the bot. */
  bulkProducts: (action: "delete" | "show" | "hide", ids: number[]) => post<{ changed: number }>("/products/bulk", { action, ids }),
  deleteProduct: (id: number) => post<{ ok: boolean }>(`/products/${id}/delete`),
  /** dryRun checks and counts without saving. A file with mistakes comes back as ImportError. */
  importProducts: (rows: ProductInput[], dryRun: boolean) => importRequest(rows, dryRun),

  // Bot settings
  settings: () => request<SettingsData>("/settings"),
  saveSettings: (input: SettingsInput) => post<SettingsData>("/settings", input),
  /** The bot's switch for everyone; takes effect at once. */
  setBotEnabled: (enabled: boolean) => post<Business>("/settings/bot", { enabled }),
  saveFaq: (id: number | null, faq: { question: string; answer: string }) => post<Faq>(id ? `/faqs/${id}` : "/faqs", faq),
  deleteFaq: (id: number) => post<{ ok: boolean }>(`/faqs/${id}/delete`),
};

/** An import the server refused: `result.errors` lists every row to fix. */
export class ImportError extends Error {
  constructor(message: string, public result: ImportResult) {
    super(message);
  }
}

async function importRequest(rows: ProductInput[], dryRun: boolean): Promise<ImportResult> {
  try {
    return await post<ImportResult>("/products/import", { rows, dry_run: dryRun });
  } catch (err) {
    const data = (err as Error & { data?: ImportResult }).data;
    if (data?.errors?.length) throw new ImportError((err as Error).message, data);
    throw err;
  }
}
