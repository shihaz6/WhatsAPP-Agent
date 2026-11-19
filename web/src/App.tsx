import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { api, authRequired, hasKey, setUnauthorizedHandler, signIn, signOut } from "./api";
import type { BusinessProfile, ConversationSummary, Faq, Message, Overview, SettingsData } from "./types";

// ---------------------------------------------------------------------------------------------
// Helpers

// Words of a name without a leading title: "Mr. Nuwan Jayasekara" -> ["Nuwan", "Jayasekara"].
const TITLES = /^(mr|mrs|ms|miss|dr|prof|rev|sir|madam)\.?$/i;
function nameWords(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 1 && TITLES.test(words[0]) ? words.slice(1) : words;
}
const firstNameOf = (name: string) => nameWords(name)[0] ?? "";

// "Gai Damsara" -> "GD", "Gai" -> "G".
function initialsOf(name: string) {
  const words = nameWords(name);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0][0] : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// "94771234567" -> "+94 77 123 4567". Other countries just get a "+".
function formatPhone(waId: string) {
  if (/^94\d{9}$/.test(waId)) return `+94 ${waId.slice(2, 4)} ${waId.slice(4, 7)} ${waId.slice(7)}`;
  return `+${waId}`;
}

const contactName = (c: { name: string | null; wa_id: string }) => c.name?.trim() || formatPhone(c.wa_id);
// A saved name gives initials; a bare number shows its operator digits (e.g. "77").
const contactInitials = (c: { name: string | null; wa_id: string }) =>
  c.name?.trim() ? initialsOf(c.name) : /^94\d{9}$/.test(c.wa_id) ? c.wa_id.slice(2, 4) : c.wa_id.slice(-2);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (iso: string, now = new Date()) => Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Chat list: "10:42", "Yesterday", "Mon", "3 Nov".
function shortTime(iso: string | null) {
  if (!iso) return "";
  const d = daysAgo(iso);
  if (d <= 0) return clock(iso);
  if (d === 1) return "Yesterday";
  if (d < 7) return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Thread separators: "Today", "Yesterday", "Thursday, 13 November".
function dayLabel(iso: string) {
  const d = daysAgo(iso);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

const MEDIA_LABELS: Record<string, string> = {
  image: "Photo",
  document: "Document",
  audio: "Voice message",
  video: "Video",
  sticker: "Sticker",
  location: "Location",
};
const mediaLabel = (type: string | null) => (type && type !== "text" ? (MEDIA_LABELS[type] ?? type) : null);

// The current time, refreshed every minute so the date and greeting stay right if the page is left open.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Loads data from the engine, optionally re-loading every `every` ms. Pass `null` to load nothing
// (e.g. while the engine isn't connected). `key` identifies what is loaded: when it changes,
// the old data is cleared instead of being shown for the new item.
function useLoad<T>(load: (() => Promise<T>) | null, { every, key = "" }: { every?: number; key?: string } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const lastKey = useRef(key);
  const enabled = load !== null;

  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      setData(null);
    }
    if (!enabled) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async (first: boolean) => {
      if (first) setLoading(true);
      try {
        const result = await loadRef.current!();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          if (every) timer = setTimeout(() => run(false), every);
        }
      }
    };
    run(true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, key, every, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

// ---------------------------------------------------------------------------------------------
// Icons and small components

type Page = "products" | "overview" | "conversations" | "settings";
type Connection = "checking" | "live" | "offline";
type IconName =
  | "box"
  | "chart"
  | "chat"
  | "settings"
  | "upload"
  | "sheet"
  | "plus"
  | "download"
  | "search"
  | "more"
  | "arrow"
  | "store"
  | "pin"
  | "card"
  | "truck"
  | "phone"
  | "check"
  | "chevron"
  | "menu"
  | "close"
  | "send"
  | "alert"
  | "users";

const iconPaths: Record<IconName, ReactNode> = {
  box: (
    <>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7M12 11v10" />
    </>
  ),
  chart: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
  chat: (
    <>
      <path d="M21 12a8 8 0 0 1-9 8 9 9 0 0 1-4-.9L3 21l1.7-4.2A8 8 0 1 1 21 12Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M20 15v5H4v-5" />
    </>
  ),
  sheet: (
    <>
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M15 2v5h4M9 11h7M9 15h7M9 19h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  store: (
    <>
      <path d="M3 10h18L19 4H5l-2 6Z" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  phone: (
    <path d="M5 3h4l2 5-2.5 1.5a15 15 0 0 0 6 6L16 13l5 2v4c0 1-1 2-2 2A16 16 0 0 1 3 5c0-1 1-2 2-2Z" />
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  send: <path d="m3 3 18 9-18 9 4-9-4-9Zm4 9h14" />,
  alert: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {iconPaths[name]}
    </svg>
  );
}

// `short` is the label under the icon in the collapsed sidebar and the phone tab bar.
const navItems: { id: Page; label: string; short: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", short: "Overview", icon: "chart" },
  { id: "products", label: "Products", short: "Products", icon: "box" },
  { id: "conversations", label: "Conversations", short: "Chats", icon: "chat" },
  { id: "settings", label: "Bot settings", short: "Settings", icon: "settings" },
];

const SIDEBAR_KEY = "catalyst.sidebarCollapsed";

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-[#FF8A4C] text-white">
        <span className="absolute h-3.5 w-1.5 -rotate-45 rounded-full bg-white" />
        <span className="absolute h-3.5 w-1.5 rotate-45 rounded-full bg-white/70" />
      </div>
      {!compact && (
        <span className="text-[19px] font-semibold tracking-tight text-white">catalyst</span>
      )}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-[#FF8A4C] text-white hover:bg-[#ee7940] shadow-[0_4px_10px_rgba(255,138,76,.18)]"
      : variant === "secondary"
        ? "border border-[#dedbd7] bg-white text-[#333] hover:border-[#bbb6b0] hover:bg-[#faf9f7]"
        : "text-[#665f59] hover:bg-[#f3f1ee]";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

// Marks a part of the design the engine can't store or use yet.
function NotConnected() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[#f1efec] px-2 py-0.5 text-[10px] font-semibold text-[#8a847e]">
      Not connected yet
    </span>
  );
}

function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3f1ee] text-[#a29c96]">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 font-semibold text-[#3a3836]">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-[#8a847e]">{text}</p>
    </div>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[#fff0ef] px-4 py-3 text-sm font-medium text-[#c2433b]">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function PageHeading({ title, text, children }: { title: ReactNode; text: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-.03em] text-[#292929] md:text-[28px]">{title}</h2>
        <p className="mt-1 text-sm text-[#77716c]">{text}</p>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Shell: sidebar, header, phone tab bar

function AppShell({
  page,
  setPage,
  businessName,
  needsYou,
  connection,
  children,
}: {
  page: Page;
  setPage: (p: Page) => void;
  businessName: string | null;
  needsYou: number;
  connection: Connection;
  children: ReactNode;
}) {
  const [mobileMenu, setMobileMenu] = useState(false);
  // Desktop sidebar: full width with labels, or a narrow icon rail (like YouTube's mini guide).
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);
  // One menu button: on desktop it expands/collapses the sidebar, on a phone it opens the drawer.
  const toggleMenu = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((c) => !c);
    else setMobileMenu(true);
  };
  const title = navItems.find((item) => item.id === page)?.label;
  const live = connection === "live";
  const status = {
    live: { dot: "bg-[#47B881]", short: "Live", title: "Bot is live", text: "Replying to customers on WhatsApp." },
    checking: { dot: "bg-[#c9a227]", short: "…", title: "Connecting", text: "Reaching the WhatsApp engine." },
    offline: { dot: "bg-[#8a8580]", short: "Offline", title: "Not connected", text: "Can't reach the WhatsApp engine." },
  }[connection];
  const badge = needsYou > 0 ? needsYou : null;

  return (
    // --sidebar-w lets the content column and fixed bars (e.g. the save bar) follow the sidebar's width.
    <div
      className="min-h-screen bg-[#f6f6f4] text-[#333]"
      style={{ "--sidebar-w": collapsed ? "76px" : "236px" } as CSSProperties}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col overflow-hidden bg-[#1A1A1A] py-7 transition-[width] duration-200 lg:flex ${collapsed ? "px-2" : "px-4"}`}
      >
        <div className={collapsed ? "flex justify-center" : "px-3"}>
          <Logo compact={collapsed} />
        </div>
        <nav className={`mt-11 ${collapsed ? "space-y-1" : "space-y-1.5"}`}>
          {navItems.map((item) => {
            const active = page === item.id;
            const showBadge = item.id === "conversations" && badge;
            return collapsed ? (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`flex w-full flex-col items-center gap-1.5 rounded-xl py-3 text-[10px] font-medium transition ${active ? "bg-[#FF8A4C] text-white" : "text-[#aaa] hover:bg-white/5 hover:text-white"}`}
              >
                <span className="relative">
                  <Icon name={item.icon} className="h-5 w-5" />
                  {showBadge && (
                    <span
                      className={`absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold ${active ? "bg-white text-[#e8743b]" : "bg-[#FF8A4C] text-white"}`}
                    >
                      {badge}
                    </span>
                  )}
                </span>
                {item.short}
              </button>
            ) : (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`group flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-3 text-sm font-medium transition ${active ? "bg-[#FF8A4C] text-white shadow-lg shadow-orange-950/10" : "text-[#aaa] hover:bg-white/5 hover:text-white"}`}
              >
                <Icon name={item.icon} className="h-[19px] w-[19px] shrink-0" />
                {item.label}
                {showBadge && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-white/20" : "bg-[#343434] text-[#d8d8d8]"}`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {collapsed ? (
          <div
            className="mt-auto flex flex-col items-center gap-1.5 text-[10px] font-medium text-[#898989]"
            title={`${status.title}: ${status.text}`}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.short}
          </div>
        ) : (
          // Fixed min width so the text doesn't reflow while the sidebar animates open.
          <div className="mt-auto min-w-[204px] rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              {status.title}
            </div>
            <p className="text-[11px] leading-relaxed text-[#898989]">{status.text}</p>
          </div>
        )}
        {businessName && (
          <div
            title={collapsed ? businessName : undefined}
            className={`mt-5 flex items-center text-left ${collapsed ? "justify-center" : "gap-3 whitespace-nowrap px-3"}`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#343434] text-xs font-semibold text-white">
              {initialsOf(businessName)}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-white">{businessName}</span>
                <span className="block text-[10px] text-[#7c7c7c]">Owner account</span>
              </span>
            )}
          </div>
        )}
      </aside>

      {mobileMenu && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#1A1A1A] p-5 transition-transform lg:hidden ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
            className="p-2 text-white"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav className="mt-9 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id);
                setMobileMenu(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${page === item.id ? "bg-[#FF8A4C] text-white" : "text-[#aaa]"}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="transition-[padding] duration-200 lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center border-b border-[#e7e5e1] bg-white/95 px-4 backdrop-blur md:px-7 lg:px-6">
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mr-3 rounded-full p-2 text-[#333] transition hover:bg-[#f1efec]"
            onClick={toggleMenu}
          >
            <Icon name="menu" />
          </button>
          <div className="min-w-0">
            {businessName && (
              <p className="hidden truncate text-[11px] font-medium uppercase tracking-[.14em] text-[#aaa] sm:block">
                {businessName}
              </p>
            )}
            <h1 className="text-lg font-semibold tracking-tight text-[#292929] sm:text-[15px]">
              {title}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${live ? "bg-[#eaf7f0] text-[#27835a]" : "bg-[#f1efec] text-[#7a746e]"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[#38a976]" : status.dot}`} />{" "}
              {live ? "Live" : connection === "checking" ? "Connecting" : "Offline"}
            </span>
          </div>
        </header>
        {/* Bottom padding clears the fixed mobile tab bar. */}
        <main className="mx-auto max-w-[1440px] p-4 pb-24 md:p-7 md:pb-24 lg:p-9">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[#e5e2de] bg-white px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-semibold ${page === item.id ? "text-[#e8743b]" : "text-[#8c8883]"}`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.short}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Overview

function OverviewPage({
  overview,
  onViewConversations,
}: {
  overview: Overview | null;
  onViewConversations: () => void;
}) {
  const now = useNow();
  const counts = overview?.counts;
  const firstName = overview?.tutor?.name ? firstNameOf(overview.tutor.name) : "";
  const value = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString("en-GB"));
  const stats: { label: string; value: string; note: string; icon: IconName }[] = [
    {
      label: "Messages answered",
      value: value(counts?.messages_out_24h),
      note: counts ? `Last 24 hours · ${counts.messages_in_24h} received` : "Last 24 hours",
      icon: "chat",
    },
    {
      label: "Customers",
      value: value(counts?.contacts),
      note: "Everyone who has messaged you",
      icon: "users",
    },
    {
      label: "Handed over to you",
      value: value(counts?.paused),
      note: !counts ? "Chats waiting for you" : counts.paused ? "Waiting for your reply" : "Bot is handling every chat",
      icon: "phone",
    },
  ];
  const problems = counts
    ? [
        counts.undelivered_24h > 0 &&
          `${counts.undelivered_24h} ${counts.undelivered_24h === 1 ? "reply" : "replies"} couldn't be sent on WhatsApp in the last 24 hours.`,
        counts.agent_errors_24h > 0 &&
          `The AI failed ${counts.agent_errors_24h} ${counts.agent_errors_24h === 1 ? "time" : "times"} in the last 24 hours; customers got the fallback message.`,
      ].filter((p): p is string => Boolean(p))
    : [];

  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-[#8f8983]">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-.03em] md:text-[28px]">
          {greetingFor(now)}
          {firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="mt-1 text-sm text-[#77716c]">
          Here’s how Catalyst is helping your customers today.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#e4e1dd] bg-white p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-[#716b66]">{stat.label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff1e8] text-[#e9763d]">
                <Icon name={stat.icon} className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-5 text-[32px] font-semibold tracking-[-.04em]">{stat.value}</p>
            <p className="mt-1 text-xs text-[#99938d]">{stat.note}</p>
          </div>
        ))}
      </div>

      {problems.length > 0 && (
        <div className="mt-4 space-y-2">
          {problems.map((p) => (
            <ErrorNote key={p}>{p}</ErrorNote>
          ))}
        </div>
      )}

      {counts && counts.paused > 0 && (
        <div className="mt-4 rounded-2xl border border-[#f0d0bc] bg-[#fffaf7] p-5 sm:flex sm:items-center">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffeadc] text-[#dd6d37]">
            <Icon name="chat" />
          </div>
          <div className="mt-3 sm:ml-4 sm:mt-0">
            <p className="font-semibold">
              {counts.paused} {counts.paused === 1 ? "conversation needs" : "conversations need"} your attention
            </p>
            <p className="mt-0.5 text-sm text-[#7e7771]">
              The bot handed {counts.paused === 1 ? "it" : "them"} over and is waiting for your reply.
            </p>
          </div>
          <Button className="mt-4 w-full sm:ml-auto sm:mt-0 sm:w-auto" onClick={onViewConversations}>
            View conversations
          </Button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Products (the engine has no products yet)

function ProductsPage() {
  const actionCards: { title: string; text: string; icon: IconName }[] = [
    { title: "Upload Excel / CSV", text: "Import your product list in one go.", icon: "upload" },
    { title: "Connect Google Sheet", text: "Keep stock and prices in sync.", icon: "sheet" },
    { title: "Add manually", text: "Create one product at a time.", icon: "plus" },
  ];
  return (
    <>
      <PageHeading title="Products" text="Give your bot the right prices, stock, and product details.">
        <a
          download="catalyst-product-template.csv"
          href={
            "data:text/csv;charset=utf-8," +
            encodeURIComponent("Product Name,Selling Price,Stock,Category,Description\n")
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#d96833] hover:underline"
        >
          <Icon name="download" className="h-4 w-4" />
          Download template
        </a>
      </PageHeading>

      <div className="grid gap-3 md:grid-cols-3">
        {actionCards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[#e4e1dd] bg-white p-5 shadow-[0_2px_8px_rgba(28,25,22,.025)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff1e8] text-[#e9763d]">
                <Icon name={card.icon} className="h-5 w-5" />
              </div>
              <NotConnected />
            </div>
            <h3 className="font-semibold text-[#30302f]">{card.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#817b75]">{card.text}</p>
          </div>
        ))}
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-[#e4e1dd] bg-white shadow-[0_2px_8px_rgba(28,25,22,.025)]">
        <div className="border-b border-[#ece9e5] p-4 sm:px-5">
          <h3 className="font-semibold text-[#2e2e2d]">Your products</h3>
        </div>
        <EmptyState
          icon="box"
          title="No products yet"
          text="The WhatsApp engine doesn't store products yet, so the bot can't answer from them. They'll show here once it does."
        />
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Conversations

function ConversationsPage({ connected, onChanged }: { connected: boolean; onChanged: () => void }) {
  const list = useLoad(connected ? api.conversations : null, { every: 5000 });
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "needs">("all");
  const [query, setQuery] = useState("");
  const detail = useLoad(connected && selected ? () => api.conversation(selected) : null, {
    every: 4000,
    key: selected ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // On desktop, open the newest chat beside the list; on a phone, start on the list.
  const rows = list.data ?? [];
  useEffect(() => {
    if (!selected && rows.length && window.matchMedia("(min-width: 1024px)").matches) setSelected(rows[0].wa_id);
  }, [rows, selected]);

  const needsYou = rows.filter((c) => c.bot_paused).length;
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = rows.filter(
    (c) =>
      (filter === "all" || c.bot_paused) &&
      (!q || contactName(c).toLowerCase().includes(q) || (digits !== "" && c.wa_id.includes(digits))),
  );
  const contact = detail.data?.contact ?? rows.find((c) => c.wa_id === selected) ?? null;
  const paused = Boolean(contact?.bot_paused);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      detail.reload();
      list.reload();
      onChanged();
      return true;
    } catch (err) {
      setActionError((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeading title="Conversations" text="See what customers are asking and step in when they need you." />
      <div className="grid grid-cols-1 h-[calc(100dvh-230px)] min-h-[520px] overflow-hidden rounded-2xl border border-[#e2dfda] bg-white shadow-[0_2px_8px_rgba(28,25,22,.03)] lg:h-[calc(100dvh-220px)] lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className={`${selected ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-[#e9e6e2]`}>
          <div className="border-b border-[#ebe8e4] p-4">
            <label className="flex items-center gap-2 rounded-xl bg-[#f6f5f3] px-3">
              <Icon name="search" className="h-4 w-4 text-[#999]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                placeholder="Search by name or number"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === "all" ? "bg-[#282725] text-white" : "bg-[#f1efec] text-[#6d6762]"}`}
              >
                All {rows.length}
              </button>
              <button
                onClick={() => setFilter("needs")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === "needs" ? "bg-[#e8743b] text-white" : "bg-[#fff0e7] text-[#cf6531]"}`}
              >
                Needs you {needsYou}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-[#eeece9] overflow-y-auto">
            {list.error && !list.data && (
              <div className="p-4">
                <ErrorNote>{list.error}</ErrorNote>
              </div>
            )}
            {!connected ? (
              <EmptyState icon="chat" title="Not connected" text="Conversations show here once the WhatsApp engine is running." />
            ) : list.data && rows.length === 0 ? (
              <EmptyState
                icon="chat"
                title="No conversations yet"
                text="When a customer messages your WhatsApp number, the chat shows up here."
              />
            ) : list.data && shown.length === 0 ? (
              <EmptyState icon="search" title="Nothing matches" text="Try another name or number, or show all chats." />
            ) : (
              shown.map((c) => (
                <ConversationRow
                  key={c.wa_id}
                  conversation={c}
                  active={selected === c.wa_id}
                  onClick={() => {
                    setSelected(c.wa_id);
                    setActionError(null);
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div className={`${selected ? "flex" : "hidden lg:flex"} min-h-0 flex-col bg-[#f8f7f5]`}>
          {!contact ? (
            <div className="m-auto">
              <EmptyState icon="chat" title="No chat open" text="Pick a conversation to read it and reply." />
            </div>
          ) : (
            <>
              <div className="flex min-h-[72px] items-center border-b border-[#e5e2de] bg-white px-4 sm:px-5">
                <button
                  aria-label="Back to the list"
                  className="mr-2 p-1 lg:hidden"
                  onClick={() => setSelected(null)}
                >
                  <Icon name="chevron" className="h-5 w-5 rotate-180" />
                </button>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8e5e1] text-xs font-semibold">
                  {contactInitials(contact)}
                </span>
                <div className="ml-3 min-w-0">
                  <p className="truncate text-sm font-semibold">{contactName(contact)}</p>
                  <p className="truncate text-xs text-[#8f8983]">
                    WhatsApp{contact.name ? ` · ${formatPhone(contact.wa_id)}` : ""}
                  </p>
                </div>
                <Button
                  className="ml-auto shrink-0 px-3 sm:px-4"
                  variant={paused ? "secondary" : "primary"}
                  disabled={busy}
                  onClick={() => act(() => (paused ? api.handBack(contact.wa_id) : api.takeOver(contact.wa_id)))}
                >
                  {paused ? "Return to bot" : "Take over"}
                </Button>
              </div>
              {paused && (
                <div className="flex items-start justify-center gap-2 border-b border-[#f4d7c5] bg-[#fff5ee] px-4 py-2 text-xs font-medium text-[#bd5e31]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e17038]" />
                  <span className="whitespace-pre-line">
                    Bot paused for this conversation — you’re replying personally.
                    {contact.paused_reason ? `\n${contact.paused_reason}` : ""}
                  </span>
                </div>
              )}
              <Thread messages={detail.data?.messages ?? null} error={detail.error} />
              <Composer
                key={contact.wa_id}
                paused={paused}
                busy={busy}
                error={actionError}
                onTakeOver={() => act(() => api.takeOver(contact.wa_id))}
                onSend={(text) => act(() => api.reply(contact.wa_id, text))}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ConversationRow({
  conversation: c,
  active,
  onClick,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onClick: () => void;
}) {
  const preview = c.last_body?.trim() || mediaLabel(c.last_type) || "No messages yet";
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left transition hover:bg-[#faf9f7] ${active ? "bg-[#fff8f3] shadow-[inset_3px_0_0_#FF8A4C]" : ""}`}
    >
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8e5e1] text-xs font-semibold text-[#5d5853]">
          {contactInitials(c)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{contactName(c)}</p>
            <span className="shrink-0 text-[10px] text-[#9d9791]">{shortTime(c.last_at)}</span>
          </div>
          <p className="mt-1 truncate text-xs text-[#827c76]">
            {c.last_direction === "out" ? "↪ " : ""}
            {preview}
          </p>
          <div className="mt-2">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${c.bot_paused ? "bg-[#fff0e7] text-[#d06531]" : "bg-[#edf6f1] text-[#3b815f]"}`}
            >
              {c.bot_paused ? "Needs you" : "Bot handling"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function Thread({ messages, error }: { messages: Message[] | null; error: string | null }) {
  const end = useRef<HTMLDivElement>(null);
  const lastId = messages?.[messages.length - 1]?.id;
  // Jump to the newest message when the chat opens or a new one arrives.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  return (
    // mt-auto on the first item pins short threads to the bottom; unlike justify-end,
    // a long thread still scrolls all the way up instead of being clipped at the top.
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-6">
      <div className="mt-auto" />
      {error && !messages && <ErrorNote>{error}</ErrorNote>}
      {messages?.length === 0 && <p className="mx-auto text-xs text-[#9c9690]">No messages in this chat yet.</p>}
      {messages?.map((m, i) => {
        const newDay = i === 0 || dayLabel(m.created_at) !== dayLabel(messages[i - 1].created_at);
        return (
          <div key={m.id} className="flex flex-col gap-3">
            {newDay && (
              <div className="mx-auto rounded-full bg-[#eae7e3] px-3 py-1 text-[10px] font-semibold uppercase text-[#817b75]">
                {dayLabel(m.created_at)}
              </div>
            )}
            <MessageBubble message={m} />
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

function MessageBubble({ message: m }: { message: Message }) {
  const from = m.direction === "in" ? "customer" : m.sent_by === "teacher" ? "owner" : "bot";
  const media = mediaLabel(m.type);
  const failed = m.status === "failed" || m.status === "not_sent";
  return (
    <div className={`max-w-[82%] ${from === "customer" ? "" : "ml-auto"}`}>
      <div
        className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${from === "owner" ? "rounded-br-sm bg-[#FF8A4C] text-white" : from === "bot" ? "rounded-br-sm bg-[#dff4e8] text-[#373a38]" : "rounded-bl-sm bg-white text-[#403d3a]"}`}
      >
        {media && (
          <span className={`block text-xs font-semibold ${m.body ? "mb-1" : ""} opacity-70`}>{media}</span>
        )}
        {m.body}
      </div>
      <p className={`mt-1 text-[10px] text-[#9c9690] ${from === "customer" ? "" : "text-right"}`}>
        {from === "bot" ? "Catalyst bot · " : from === "owner" ? "You · " : ""}
        {clock(m.created_at)}
        {failed && (
          <span className="font-semibold text-[#c2433b]" title={m.error ?? undefined}>
            {" "}
            · Not delivered
          </span>
        )}
        {m.agent_error && <span className="text-[#c2433b]"> · AI failed, fallback sent</span>}
      </p>
    </div>
  );
}

function Composer({
  paused,
  busy,
  error,
  onTakeOver,
  onSend,
}: {
  paused: boolean;
  busy: boolean;
  error: string | null;
  onTakeOver: () => void;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [reply, setReply] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const text = reply.trim();
        if (text && (await onSend(text))) setReply("");
      }}
      className="border-t border-[#e5e2de] bg-white p-3 sm:p-4"
    >
      {error && (
        <div className="mb-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {!paused ? (
        <button
          type="button"
          disabled={busy}
          onClick={onTakeOver}
          className="w-full rounded-xl border border-dashed border-[#e0b79f] bg-[#fffaf7] py-3 text-sm font-semibold text-[#ce6634] disabled:opacity-50"
        >
          Take over to reply to this customer
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={4096}
            placeholder="Write a reply..."
            className="min-w-0 flex-1 rounded-xl border border-[#dedbd7] px-4 py-3 text-sm outline-none focus:border-[#f09a6d]"
          />
          <button
            type="submit"
            aria-label="Send reply"
            disabled={busy || !reply.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FF8A4C] text-white disabled:opacity-50"
          >
            <Icon name="send" className="h-5 w-5" />
          </button>
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------------------------
// Bot settings

function SettingsPage({ connected, onSaved }: { connected: boolean; onSaved: () => void }) {
  const settings = useLoad<SettingsData>(connected ? api.settings : null);
  const profile = settings.data?.tutor ?? null;
  const [name, setName] = useState("");
  const [payment, setPayment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Faq | "new" | null>(null);

  // Fill the form from the engine whenever it (re)loads.
  useEffect(() => {
    setName(profile?.name ?? "");
    setPayment(profile?.payment_instructions ?? "");
  }, [profile]);

  const dirty = connected && (name !== (profile?.name ?? "") || payment !== (profile?.payment_instructions ?? ""));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // bio and qualifications aren't on this page; send them back unchanged.
      const next: BusinessProfile = {
        name: name.trim(),
        bio: profile?.bio ?? null,
        qualifications: profile?.qualifications ?? null,
        payment_instructions: payment.trim() || null,
      };
      const savedProfile = await api.saveProfile(next);
      settings.setData((s) => (s ? { ...s, tutor: savedProfile } : s));
      setSaved(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const faqs = settings.data?.faqs ?? [];

  return (
    // While the save bar is showing, extra bottom padding keeps it off the last cards.
    <div className={dirty ? "pb-24" : ""}>
      <PageHeading title="Bot settings" text="Teach Catalyst how your business works and when to hand over.">
        <div className="flex items-center gap-3 rounded-xl border border-[#dfdcd8] bg-white px-4 py-2.5">
          <div>
            <p className="text-xs font-semibold">Bot on for everyone</p>
            <p className="text-[10px] text-[#9b958f]">Pause single chats from Conversations</p>
          </div>
          <NotConnected />
        </div>
      </PageHeading>

      {!connected && (
        <div className="mb-4">
          <ErrorNote>Not connected to the WhatsApp engine, so settings can't be loaded or saved.</ErrorNote>
        </div>
      )}
      {settings.error && (
        <div className="mb-4">
          <ErrorNote>{settings.error}</ErrorNote>
        </div>
      )}
      {saved && !dirty && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#eaf7f0] px-4 py-3 text-sm font-medium text-[#267b55]">
          <Icon name="check" className="h-4 w-4" />
          Settings saved. The bot uses them from the next message.
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <SettingsCard
            icon="store"
            title="Business information"
            subtitle="Details the bot uses to answer common questions."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Business name"
                value={name}
                onChange={(v) => {
                  setName(v);
                  setSaved(false);
                }}
                disabled={!connected}
              />
              <Field
                label="Payment details"
                value={payment}
                onChange={(v) => {
                  setPayment(v);
                  setSaved(false);
                }}
                placeholder="e.g. Bank transfer to …"
                icon="card"
                disabled={!connected}
              />
            </div>
            <div className="mt-5 rounded-xl border border-dashed border-[#e3dfda] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#5b5651]">More details</p>
                <NotConnected />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Opening hours" disabled />
                <Field label="Location" icon="pin" disabled />
              </div>
              <div className="mt-4">
                <Field label="Delivery information" icon="truck" disabled />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            icon="chat"
            title="Frequently asked questions"
            subtitle="Answers the bot can give customers. Changes save straight away."
          >
            {connected && settings.data && faqs.length === 0 && (
              <p className="text-sm text-[#8a847e]">No FAQs yet.</p>
            )}
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={faq.id} className="rounded-xl border border-[#e7e3df] bg-[#faf9f7] p-4">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#99928c]">
                      Question {i + 1}
                    </span>
                    <button onClick={() => setEditing(faq)} className="text-xs font-semibold text-[#d06735]">
                      Edit
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{faq.question}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#77716b]">{faq.answer}</p>
                </div>
              ))}
            </div>
            <button
              disabled={!connected}
              onClick={() => setEditing("new")}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#d96833] disabled:opacity-40"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add an FAQ
            </button>
          </SettingsCard>
        </div>

        <div className="space-y-5">
          <SettingsCard
            icon="chat"
            title="Reply languages"
            subtitle="Catalyst replies in the language each customer writes in."
            badge={<NotConnected />}
          >
            <div className="space-y-2">
              {["Sinhala", "Tamil", "English"].map((language) => (
                <div
                  key={language}
                  className="flex w-full items-center justify-between rounded-xl border border-[#e5e1dd] px-4 py-3 text-sm font-medium text-[#9a948e]"
                >
                  <span>{language}</span>
                  <span className="grid h-5 w-5 place-items-center rounded-md border border-[#dcd8d3]" />
                </div>
              ))}
            </div>
          </SettingsCard>
          <SettingsCard
            icon="phone"
            title="Handover"
            subtitle="Where and when Catalyst should ask you to step in."
            badge={<NotConnected />}
          >
            <Field label="WhatsApp handover number" disabled />
            <p className="mb-2 mt-5 text-xs font-semibold text-[#5b5651]">Hand over when</p>
            <div className="space-y-3">
              {["Customer asks to speak to a person", "Bot is unsure of the answer", "Bulk order over 10 items"].map(
                (rule) => (
                  <label key={rule} className="flex items-start gap-3 text-sm leading-snug text-[#9a948e]">
                    <input type="checkbox" disabled className="mt-0.5 h-4 w-4" />
                    {rule}
                  </label>
                ),
              )}
            </div>
          </SettingsCard>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-4 bottom-20 z-30 flex items-center justify-between gap-3 rounded-2xl border border-[#e3dfdb] bg-white/95 py-3 pl-4 pr-3 shadow-[0_-4px_20px_rgba(30,28,25,.08)] backdrop-blur md:inset-x-7 lg:bottom-6 lg:left-[calc(var(--sidebar-w)+36px)] lg:right-9">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#5b5651]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#FF8A4C]" />
            <span className="truncate">{error ?? "You have unsaved changes"}</span>
          </span>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setName(profile?.name ?? "");
                setPayment(profile?.payment_instructions ?? "");
                setError(null);
              }}
            >
              Discard
            </Button>
            <Button disabled={saving || !name.trim()} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <FaqEditor
          faq={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            settings.reload();
          }}
        />
      )}
    </div>
  );
}

function FaqEditor({ faq, onClose, onDone }: { faq: Faq | null; onClose: () => void; onDone: () => void }) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <Modal title={faq ? "Edit FAQ" : "Add an FAQ"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => api.saveFaq(faq?.id ?? null, { question: question.trim(), answer: answer.trim() }));
        }}
        className="space-y-4"
      >
        <Field label="Question" value={question} onChange={setQuestion} placeholder="e.g. Do you deliver?" />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#5b5651]">Answer</span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-[#dedbd7] px-3 py-2.5 text-sm outline-none focus:border-[#ed9a70] focus:ring-2 focus:ring-[#fff0e8]"
          />
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex items-center gap-2 pt-2">
          {faq && (
            <Button
              variant="ghost"
              className="text-[#c2433b]"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Delete this FAQ? The bot stops using it straight away.")) run(() => api.deleteFaq(faq.id));
              }}
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !question.trim() || !answer.trim()}>
            {busy ? "Saving…" : "Save FAQ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SettingsCard({
  icon,
  title,
  subtitle,
  badge,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e4e1dd] bg-white p-5">
      <div className="mb-5 flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff1e8] text-[#df6e37]">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold">{title}</h3>
            {badge}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-[#918b85]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  disabled = false,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#5b5651]">{label}</span>
      <span
        className={`flex items-center gap-2 rounded-xl border border-[#dedbd7] px-3 focus-within:border-[#ed9a70] focus-within:ring-2 focus-within:ring-[#fff0e8] ${disabled ? "bg-[#f7f6f4]" : "bg-white"}`}
      >
        {icon && <Icon name={icon} className="h-4 w-4 text-[#9a948e]" />}
        <input
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[#aaa59f] disabled:cursor-not-allowed"
        />
      </span>
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/40 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4">
      <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-[#777] hover:bg-[#f3f1ee]">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Sign-in (only when the engine has ADMIN_TOKEN set)

function SignIn({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid min-h-screen place-items-center bg-[#1A1A1A] p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await signIn(key.trim());
            onDone();
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 w-fit rounded-xl bg-[#1A1A1A] p-2 pr-3">
          <Logo />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-[#77716c]">Enter the access key (ADMIN_TOKEN) set on the server.</p>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-xs font-semibold text-[#5b5651]">Access key</span>
          <input
            type="password"
            autoFocus
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded-xl border border-[#dedbd7] px-3 py-2.5 text-sm outline-none focus:border-[#ed9a70] focus:ring-2 focus:ring-[#fff0e8]"
          />
        </label>
        {error && (
          <div className="mt-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <Button type="submit" className="mt-5 w-full" disabled={busy || !key.trim()}>
          {busy ? "Checking…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// App

// The open page lives in the URL hash (#conversations), so a refresh or a shared link keeps it.
const pageFromHash = (): Page => {
  const id = window.location.hash.slice(1);
  return navItems.some((item) => item.id === id) ? (id as Page) : "overview";
};

export default function App() {
  const [page, setPageState] = useState<Page>(pageFromHash);
  const setPage = useCallback((p: Page) => {
    setPageState(p);
    window.history.replaceState(null, "", `#${p}`);
  }, []);
  // checking -> ready (or signin when the server wants a key), offline when the engine can't be reached.
  const [state, setState] = useState<"checking" | "offline" | "signin" | "ready">("checking");

  const connect = useCallback(async () => {
    setState("checking");
    try {
      const required = await authRequired();
      setState(required && !hasKey() ? "signin" : "ready");
    } catch {
      setState("offline");
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
      setState("signin");
    });
    connect();
  }, [connect]);

  // Each page opens at the top; otherwise the old scroll position leaves its first rows under the sticky header.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const connected = state === "ready";
  const overview = useLoad(connected ? api.overview : null, { every: 15_000 });
  const connection: Connection =
    state === "checking" ? "checking" : connected && !overview.error ? "live" : "offline";

  if (state === "signin") return <SignIn onDone={() => setState("ready")} />;

  return (
    <AppShell
      page={page}
      setPage={setPage}
      businessName={overview.data?.tutor?.name ?? null}
      needsYou={overview.data?.counts.paused ?? 0}
      connection={connection}
    >
      {(state === "offline" || (connected && overview.error)) && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#e4e1dd] bg-white p-4 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3f1ee] text-[#8a847e]">
            <Icon name="alert" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Not connected to the WhatsApp engine</p>
            <p className="mt-0.5 text-sm text-[#7e7771]">
              {overview.error ?? "Start it with npm start in the project folder, then try again."}
            </p>
          </div>
          <Button variant="secondary" className="sm:ml-auto" onClick={connected ? overview.reload : connect}>
            Try again
          </Button>
        </div>
      )}
      {page === "overview" && (
        <OverviewPage overview={overview.data} onViewConversations={() => setPage("conversations")} />
      )}
      {page === "products" && <ProductsPage />}
      {page === "conversations" && <ConversationsPage connected={connected} onChanged={overview.reload} />}
      {page === "settings" && <SettingsPage connected={connected} onSaved={overview.reload} />}
    </AppShell>
  );
}
