import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// The account shown across the dashboard. The header and "Business name" use the shop's name;
// the greeting and the avatar use the owner's.
const account = {
  ownerName: "Gai Damsara",
  businessName: "Gai Damsara",
};

// "Gai Damsara" -> "GD", "Gai" -> "G".
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
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

// The current time, refreshed every minute so the date and greeting stay right if the page is left open.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

type Page = "products" | "overview" | "conversations" | "settings";
type IconName =
  | "box"
  | "chart"
  | "chat"
  | "settings"
  | "upload"
  | "sheet"
  | "plus"
  | "refresh"
  | "download"
  | "search"
  | "more"
  | "arrow"
  | "store"
  | "clock"
  | "pin"
  | "card"
  | "truck"
  | "phone"
  | "check"
  | "chevron"
  | "menu"
  | "close"
  | "send";

const iconPaths: Record<IconName, ReactNode> = {
  box: (
    <>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7M12 11v10" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </>
  ),
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
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M19 12a7 7 0 1 0-2 5" />
    </>
  ),
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
  arrow: (
    <>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </>
  ),
  store: (
    <>
      <path d="M3 10h18L19 4H5l-2 6Z" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
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

const products = [
  {
    name: "Ceylon Cinnamon Sticks",
    detail: "100g pack",
    price: "Rs 1,250",
    stock: 24,
    category: "Spices",
  },
  {
    name: "Organic Coconut Oil",
    detail: "500ml bottle",
    price: "Rs 1,800",
    stock: 12,
    category: "Pantry",
  },
  {
    name: "Kithul Treacle",
    detail: "350ml bottle",
    price: "Rs 980",
    stock: 0,
    category: "Sweeteners",
  },
  {
    name: "Ceylon Black Tea",
    detail: "200g loose leaf",
    price: "Rs 1,450",
    stock: 38,
    category: "Tea",
  },
  {
    name: "Roasted Cashews",
    detail: "250g pouch",
    price: "Rs 2,200",
    stock: 6,
    category: "Snacks",
  },
];

const conversations = [
  {
    id: 1,
    name: "Nadeesha Perera",
    initials: "NP",
    message: "Can you deliver to Kandy by Friday?",
    time: "10:42",
    status: "Needs you",
    unread: 2,
  },
  {
    id: 2,
    name: "+94 77 324 8810",
    initials: "77",
    message: "Thank you, I’ll place the order now.",
    time: "09:18",
    status: "Bot handled",
    unread: 0,
  },
  {
    id: 3,
    name: "Ashan Fernando",
    initials: "AF",
    message: "Is the coconut oil cold pressed?",
    time: "Yesterday",
    status: "Bot handled",
    unread: 0,
  },
  {
    id: 4,
    name: "Fathima Rizan",
    initials: "FR",
    message: "I need 20 packs. Is there a bulk price?",
    time: "Yesterday",
    status: "Needs you",
    unread: 1,
  },
  {
    id: 5,
    name: "+94 71 882 1045",
    initials: "71",
    message: "What payment methods do you accept?",
    time: "Mon",
    status: "Bot handled",
    unread: 0,
  },
];

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
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
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
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

function AppShell({
  page,
  setPage,
  children,
}: {
  page: Page;
  setPage: (p: Page) => void;
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
  const needsYou = 3;
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
                  {item.id === "conversations" && (
                    <span
                      className={`absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold ${active ? "bg-white text-[#e8743b]" : "bg-[#FF8A4C] text-white"}`}
                    >
                      {needsYou}
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
                {item.id === "conversations" && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-white/20" : "bg-[#343434] text-[#d8d8d8]"}`}
                  >
                    {needsYou}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {collapsed ? (
          <div
            className="mt-auto flex flex-col items-center gap-1.5 text-[10px] font-medium text-[#898989]"
            title="Bot is live: replying to customers on WhatsApp"
          >
            <span className="h-2 w-2 rounded-full bg-[#47B881]" />
            Live
          </div>
        ) : (
          // Fixed min width so the text doesn't reflow while the sidebar animates open.
          <div className="mt-auto min-w-[204px] rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-[#47B881]" />
              Bot is live
            </div>
            <p className="text-[11px] leading-relaxed text-[#898989]">
              Replying to customers on WhatsApp.
            </p>
          </div>
        )}
        <button
          title={collapsed ? `${account.ownerName} · Owner account` : undefined}
          className={`mt-5 flex items-center text-left ${collapsed ? "justify-center" : "gap-3 whitespace-nowrap px-3"}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#343434] text-xs font-semibold text-white">
            {initialsOf(account.ownerName)}
          </span>
          {!collapsed && (
            <>
              <span>
                <span className="block text-xs font-medium text-white">{account.ownerName}</span>
                <span className="block text-[10px] text-[#7c7c7c]">Owner account</span>
              </span>
              <Icon name="more" className="ml-auto h-4 w-4 text-[#777]" />
            </>
          )}
        </button>
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
          <div>
            <p className="hidden text-[11px] font-medium uppercase tracking-[.14em] text-[#aaa] sm:block">
              {account.businessName}
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-[#292929] sm:text-[15px]">
              {title}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf7f0] px-2.5 py-1.5 text-xs font-semibold text-[#27835a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#38a976]" /> Live
            </span>
            <span className="hidden h-5 w-px bg-[#e2dfda] sm:block" />
            <span className="rounded-full bg-[#fff4eb] px-2.5 py-1.5 text-xs font-semibold text-[#c96531]">
              Trial: 5 days left
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

function ProductsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [showImport, setShowImport] = useState(false);
  const [synced, setSynced] = useState("10 min ago");
  const [query, setQuery] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [notice, setNotice] = useState("");
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()),
  );
  const actionCards = [
    {
      title: "Upload Excel / CSV",
      text: "Import your product list in one go.",
      icon: "upload" as IconName,
      action: () => fileInput.current?.click(),
      button: "Choose a file",
    },
    {
      title: "Connect Google Sheet",
      text: "Keep stock and prices in sync.",
      icon: "sheet" as IconName,
      action: () => setNotice("Google Sheet connected"),
      button: "Connect sheet",
    },
    {
      title: "Add manually",
      text: "Create one product at a time.",
      icon: "plus" as IconName,
      action: () => setShowManual(true),
      button: "Add product",
    },
  ];
  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-.03em] text-[#292929] md:text-[28px]">
            Products
          </h2>
          <p className="mt-1 text-sm text-[#77716c]">
            Give your bot the right prices, stock, and product details.
          </p>
        </div>
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
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {actionCards.map((card) => (
          <div
            key={card.title}
            className="group rounded-2xl border border-[#e4e1dd] bg-white p-5 shadow-[0_2px_8px_rgba(28,25,22,.025)] transition hover:-translate-y-0.5 hover:border-[#f2b18d] hover:shadow-[0_8px_24px_rgba(28,25,22,.06)]"
          >
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#fff1e8] text-[#e9763d]">
              <Icon name={card.icon} className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-[#30302f]">{card.title}</h3>
            <p className="mt-1 min-h-10 text-sm leading-relaxed text-[#817b75]">{card.text}</p>
            <button
              onClick={card.action}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#d96833]"
            >
              {card.button}
              <Icon name="arrow" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        ))}
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setShowImport(true)}
        />
      </div>

      {showImport && (
        <div className="mt-5 rounded-2xl border border-[#f2c6aa] bg-[#fffaf7] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffeadc] text-[#dc6d37]">
              <Icon name="check" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#343230]">We found 48 products</p>
              <p className="mt-1 text-sm text-[#756f69]">
                Price column ={" "}
                <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-[#4b4743]">
                  'Selling Price'
                </span>{" "}
                · Stock column ={" "}
                <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-[#4b4743]">
                  'Qty'
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowImport(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowImport(false);
                  setNotice("48 products imported successfully");
                }}
              >
                Confirm import
              </Button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#eaf7f0] px-4 py-3 text-sm font-medium text-[#267b55]">
          <Icon name="check" className="h-4 w-4" />
          {notice}
          <button className="ml-auto" onClick={() => setNotice("")}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-[#e4e1dd] bg-white shadow-[0_2px_8px_rgba(28,25,22,.025)]">
        <div className="flex flex-col gap-4 border-b border-[#ece9e5] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="font-semibold text-[#2e2e2d]">
              Your products <span className="ml-1 text-sm font-normal text-[#99928c]">48</span>
            </h3>
            <p className="mt-0.5 text-xs text-[#9a938d]">Last synced: {synced}</p>
          </div>
          <div className="flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#e2dfdb] bg-[#fafaf9] px-3 sm:w-52">
              <Icon name="search" className="h-4 w-4 text-[#9a9691]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products"
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[#aaa6a1]"
              />
            </label>
            <Button
              variant="secondary"
              className="shrink-0 px-3 sm:px-4"
              onClick={() => {
                setSynced("just now");
                setNotice("Products synced with Google Sheet");
              }}
            >
              <Icon name="refresh" className="h-4 w-4" />
              <span className="hidden sm:inline">Sync now</span>
            </Button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-[.08em] text-[#97918b]">
                <th className="px-5 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efedea]">
              {filtered.map((product) => (
                <tr key={product.name} className="transition hover:bg-[#fdfcfb]">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#373533]">{product.name}</p>
                    <p className="mt-0.5 text-xs text-[#99938d]">{product.detail}</p>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">{product.price}</td>
                  <td className="px-4 py-4">
                    {product.stock === 0 ? (
                      <span className="rounded-full bg-[#fff0ef] px-2.5 py-1 text-xs font-semibold text-[#d64b43]">
                        Out of stock
                      </span>
                    ) : (
                      <span
                        className={`text-sm font-medium ${product.stock < 10 ? "text-[#d56c32]" : "text-[#55514d]"}`}
                      >
                        {product.stock} units
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-lg bg-[#f2f1ef] px-2.5 py-1 text-xs text-[#65605b]">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => {
                        setShowManual(true);
                        setNotice(`Editing ${product.name}`);
                      }}
                      className="rounded-lg border border-[#e1ded9] px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f4f2]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-[#eeebe7] md:hidden">
          {filtered.map((product) => (
            <div key={product.name} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold">{product.name}</h4>
                  <p className="mt-0.5 text-xs text-[#928c86]">
                    {product.detail} · {product.category}
                  </p>
                </div>
                <button
                  aria-label={`Edit ${product.name}`}
                  onClick={() => setShowManual(true)}
                  className="rounded-lg border border-[#e4e0dc] p-2"
                >
                  <Icon name="more" className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold">{product.price}</span>
                {product.stock === 0 ? (
                  <span className="rounded-full bg-[#fff0ef] px-2.5 py-1 text-xs font-semibold text-[#d64b43]">
                    Out of stock
                  </span>
                ) : (
                  <span
                    className={`text-xs font-medium ${product.stock < 10 ? "text-[#d56c32]" : "text-[#777]"}`}
                  >
                    {product.stock} in stock
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {showManual && (
        <Modal
          title={notice.startsWith("Editing") ? "Edit product" : "Add a product"}
          onClose={() => {
            setShowManual(false);
            if (notice.startsWith("Editing")) setNotice("");
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowManual(false);
              setNotice("Product saved successfully");
            }}
            className="space-y-4"
          >
            <Field label="Product name" placeholder="e.g. Ceylon Black Tea" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (Rs)" placeholder="1,250" />
              <Field label="Stock" placeholder="24" />
            </div>
            <Field label="Category" placeholder="e.g. Tea" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowManual(false)}>
                Cancel
              </Button>
              <Button type="submit">Save product</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function OverviewPage({ onViewConversations }: { onViewConversations: () => void }) {
  const stats = [
    {
      label: "Messages answered today",
      value: "38",
      note: "+12% from yesterday",
      icon: "chat" as IconName,
    },
    {
      label: "Customers helped this week",
      value: "127",
      note: "Across 183 conversations",
      icon: "chart" as IconName,
    },
    {
      label: "Handed over to you",
      value: "9",
      note: "3 still need a reply",
      icon: "phone" as IconName,
    },
  ];
  const now = useNow();
  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-[#8f8983]">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-.03em] md:text-[28px]">
          {greetingFor(now)}, {account.ownerName.split(" ")[0]}
        </h2>
        <p className="mt-1 text-sm text-[#77716c]">
          Here’s how Catalyst is helping your customers today.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
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
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-[#242321] p-6 text-white">
          <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#FF8A4C]/10" />
          <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#FF9E69]">
            Your week with Catalyst
          </span>
          <h3 className="mt-5 max-w-lg text-2xl font-medium leading-snug tracking-[-.025em] md:text-[28px]">
            Catalyst answered <span className="text-[#FF9A62]">214 messages</span> for you this
            week.
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#aaa7a3]">
            That’s about 3.5 hours saved — time you can spend running your business.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[72%] rounded-full bg-[#FF8A4C]" />
            </div>
            <span className="text-xs text-[#a8a5a0]">5 days left</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e4e1dd] bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Most asked about</h3>
            <span className="text-xs text-[#96908a]">This week</span>
          </div>
          <div className="mt-5 space-y-5">
            {["Ceylon Cinnamon Sticks", "Delivery to Kandy", "Payment methods"].map((item, i) => (
              <div key={item} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f3f1ee] text-xs font-bold text-[#8a837d]">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item}</span>
                    <span className="text-[#96908a]">{[47, 32, 26][i]}</span>
                  </div>
                  <div className="mt-2 h-1 rounded bg-[#eeeae6]">
                    <div
                      className="h-full rounded bg-[#FF8A4C]"
                      style={{ width: `${[100, 68, 55][i]}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-[#f0d0bc] bg-[#fffaf7] p-5 sm:flex sm:items-center">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffeadc] text-[#dd6d37]">
          <Icon name="chat" />
        </div>
        <div className="mt-3 sm:ml-4 sm:mt-0">
          <p className="font-semibold">3 conversations need your attention</p>
          <p className="mt-0.5 text-sm text-[#7e7771]">
            Customers are waiting for a personal reply.
          </p>
        </div>
        <Button className="mt-4 w-full sm:ml-auto sm:mt-0 sm:w-auto" onClick={onViewConversations}>
          View conversations
        </Button>
      </div>
    </>
  );
}

function ConversationsPage() {
  // On a phone, start on the list (only one pane fits); on desktop, open the first chat beside it.
  const [selected, setSelected] = useState(() =>
    window.matchMedia("(min-width: 1024px)").matches ? conversations[0].id : 0,
  );
  const [takenOver, setTakenOver] = useState(false);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const active = conversations.find((c) => c.id === selected) ?? conversations[0];
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-[-.03em] md:text-[28px]">Conversations</h2>
        <p className="mt-1 text-sm text-[#77716c]">
          See what customers are asking and step in when they need you.
        </p>
      </div>
      <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-[#e2dfda] bg-white shadow-[0_2px_8px_rgba(28,25,22,.03)] lg:grid-cols-[360px_1fr]">
        <div className={`${selected ? "hidden lg:block" : "block"} border-r border-[#e9e6e2]`}>
          <div className="border-b border-[#ebe8e4] p-4">
            <label className="flex items-center gap-2 rounded-xl bg-[#f6f5f3] px-3">
              <Icon name="search" className="h-4 w-4 text-[#999]" />
              <input
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                placeholder="Search conversations"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button className="rounded-full bg-[#282725] px-3 py-1.5 text-xs font-semibold text-white">
                All 12
              </button>
              <button className="rounded-full bg-[#fff0e7] px-3 py-1.5 text-xs font-semibold text-[#cf6531]">
                Needs you 3
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#eeece9]">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  setSelected(conversation.id);
                  setTakenOver(false);
                }}
                className={`w-full p-4 text-left transition hover:bg-[#faf9f7] ${selected === conversation.id ? "bg-[#fff8f3] shadow-[inset_3px_0_0_#FF8A4C]" : ""}`}
              >
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8e5e1] text-xs font-semibold text-[#5d5853]">
                    {conversation.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{conversation.name}</p>
                      <span className="shrink-0 text-[10px] text-[#9d9791]">
                        {conversation.time}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#827c76]">{conversation.message}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${conversation.status === "Needs you" ? "bg-[#fff0e7] text-[#d06531]" : "bg-[#edf6f1] text-[#3b815f]"}`}
                      >
                        {conversation.status}
                      </span>
                      {conversation.unread > 0 && (
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#FF8A4C] text-[10px] font-bold text-white">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className={`${selected ? "flex" : "hidden lg:flex"} flex-col bg-[#f8f7f5]`}>
          <div className="flex min-h-[72px] items-center border-b border-[#e5e2de] bg-white px-4 sm:px-5">
            <button className="mr-2 p-1 lg:hidden" onClick={() => setSelected(0)}>
              <Icon name="chevron" className="h-5 w-5 rotate-180" />
            </button>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e8e5e1] text-xs font-semibold">
              {active.initials}
            </span>
            <div className="ml-3">
              <p className="text-sm font-semibold">{active.name}</p>
              <p className="text-xs text-[#8f8983]">WhatsApp · Active now</p>
            </div>
            <Button
              className="ml-auto px-3 sm:px-4"
              variant={takenOver ? "secondary" : "primary"}
              onClick={() => setTakenOver(!takenOver)}
            >
              {takenOver ? "Return to bot" : "Take over"}
            </Button>
          </div>
          {takenOver && (
            <div className="flex items-center justify-center gap-2 border-b border-[#f4d7c5] bg-[#fff5ee] px-4 py-2 text-xs font-medium text-[#bd5e31]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e17038]" />
              Bot paused for this conversation — you’re replying personally
            </div>
          )}
          {/* mt-auto on the first item pins short threads to the bottom; unlike justify-end,
              a long thread still scrolls all the way up instead of being clipped at the top. */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto mt-auto rounded-full bg-[#eae7e3] px-3 py-1 text-[10px] font-semibold text-[#817b75]">
              TODAY
            </div>
            <Message time="10:36" text="Hi, do you deliver orders outside Colombo?" />
            <Message
              bot
              time="10:36"
              text="Yes, we deliver island-wide. Delivery usually takes 2–4 working days depending on your location."
            />
            <Message
              time="10:40"
              text="Can you deliver to Kandy by Friday? I need 3 packs of cinnamon sticks."
            />
            <div className="mx-auto my-1 flex items-center gap-2 rounded-full bg-[#fff0e7] px-3 py-1.5 text-[10px] font-semibold text-[#cb6332]">
              <Icon name="phone" className="h-3 w-3" />
              Bot handed this over to you
            </div>
            {sent.map((message, i) => (
              <Message key={i} owner time="Now" text={message} />
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim()) {
                setSent([...sent, reply]);
                setReply("");
              }
            }}
            className="border-t border-[#e5e2de] bg-white p-3 sm:p-4"
          >
            {!takenOver ? (
              <button
                type="button"
                onClick={() => setTakenOver(true)}
                className="w-full rounded-xl border border-dashed border-[#e0b79f] bg-[#fffaf7] py-3 text-sm font-semibold text-[#ce6634]"
              >
                Take over to reply to this customer
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  autoFocus
                  placeholder="Write a reply..."
                  className="min-w-0 flex-1 rounded-xl border border-[#dedbd7] px-4 py-3 text-sm outline-none focus:border-[#f09a6d]"
                />
                <button
                  type="submit"
                  aria-label="Send reply"
                  className="grid h-11 w-11 place-items-center rounded-xl bg-[#FF8A4C] text-white"
                >
                  <Icon name="send" className="h-5 w-5" />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

function Message({
  text,
  time,
  bot,
  owner,
}: {
  text: string;
  time: string;
  bot?: boolean;
  owner?: boolean;
}) {
  return (
    <div className={`max-w-[82%] ${bot || owner ? "ml-auto" : ""}`}>
      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${owner ? "rounded-br-sm bg-[#FF8A4C] text-white" : bot ? "rounded-br-sm bg-[#dff4e8] text-[#373a38]" : "rounded-bl-sm bg-white text-[#403d3a]"}`}
      >
        {text}
      </div>
      <p className={`mt-1 text-[10px] text-[#9c9690] ${bot || owner ? "text-right" : ""}`}>
        {bot ? "Catalyst bot · " : owner ? "You · " : ""}
        {time}
      </p>
    </div>
  );
}

function SettingsPage() {
  const [botOn, setBotOn] = useState(true);
  const [languages, setLanguages] = useState(["English", "Sinhala"]);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };
  const toggleLanguage = (language: string) => {
    markDirty();
    setLanguages(
      languages.includes(language)
        ? languages.filter((l) => l !== language)
        : [...languages, language],
    );
  };
  return (
    // Typing in any field or ticking a box bubbles a change event up to here.
    // While the save bar is showing, extra bottom padding keeps it off the last cards.
    <div onChange={markDirty} className={dirty ? "pb-24" : ""}>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-.03em] md:text-[28px]">Bot settings</h2>
          <p className="mt-1 text-sm text-[#77716c]">
            Teach Catalyst how your business works and when to hand over.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#dfdcd8] bg-white px-4 py-2.5">
          <div>
            <p className="text-xs font-semibold">Bot is {botOn ? "on" : "paused"}</p>
            <p className="text-[10px] text-[#9b958f]">
              {botOn ? "Replying to customers" : "Not sending replies"}
            </p>
          </div>
          <Switch
            on={botOn}
            setOn={(on) => {
              setBotOn(on);
              markDirty();
            }}
          />
        </div>
      </div>
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#eaf7f0] px-4 py-3 text-sm font-medium text-[#267b55]">
          <Icon name="check" className="h-4 w-4" />
          Settings saved successfully
        </div>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          <SettingsCard
            icon="store"
            title="Business information"
            subtitle="Details the bot uses to answer common questions."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" defaultValue={account.businessName} />
              <Field label="Opening hours" defaultValue="Mon–Sat, 9:00 AM–7:00 PM" />
              <Field label="Location" defaultValue="42 Galle Road, Colombo 04" icon="pin" />
              <Field
                label="Payment details"
                defaultValue="Cash, card or bank transfer"
                icon="card"
              />
            </div>
            <div className="mt-4">
              <Field
                label="Delivery information"
                defaultValue="Island-wide delivery in 2–4 working days. Colombo: Rs 350, other areas: Rs 500."
                icon="truck"
              />
            </div>
          </SettingsCard>
          <SettingsCard
            icon="chat"
            title="Frequently asked questions"
            subtitle="Add answers your bot can use with customers."
          >
            <div className="space-y-3">
              {[
                {
                  q: "Do you offer cash on delivery?",
                  a: "Yes, cash on delivery is available for orders under Rs 10,000.",
                },
                {
                  q: "Can I return a product?",
                  a: "Unopened products can be returned within 7 days with the receipt.",
                },
              ].map((faq, i) => (
                <div key={faq.q} className="rounded-xl border border-[#e7e3df] bg-[#faf9f7] p-4">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#99928c]">
                      Question {i + 1}
                    </span>
                    <button className="text-xs font-semibold text-[#d06735]">Edit</button>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{faq.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#77716b]">{faq.a}</p>
                </div>
              ))}
            </div>
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#d96833]">
              <Icon name="plus" className="h-4 w-4" />
              Add another FAQ
            </button>
          </SettingsCard>
        </div>
        <div className="space-y-5">
          <SettingsCard
            icon="chat"
            title="Reply languages"
            subtitle="Catalyst will reply in the customer’s language."
          >
            <div className="space-y-2">
              {["Sinhala", "Tamil", "English"].map((language) => (
                <button
                  key={language}
                  onClick={() => toggleLanguage(language)}
                  className="flex w-full items-center justify-between rounded-xl border border-[#e5e1dd] px-4 py-3 text-sm font-medium"
                >
                  <span>{language}</span>
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-md border ${languages.includes(language) ? "border-[#FF8A4C] bg-[#FF8A4C] text-white" : "border-[#ccc7c1]"}`}
                  >
                    {languages.includes(language) && <Icon name="check" className="h-3.5 w-3.5" />}
                  </span>
                </button>
              ))}
            </div>
          </SettingsCard>
          <SettingsCard
            icon="phone"
            title="Handover"
            subtitle="Where and when Catalyst should ask you to step in."
          >
            <Field label="WhatsApp handover number" defaultValue="+94 77 123 4567" />
            <p className="mb-2 mt-5 text-xs font-semibold text-[#5b5651]">Hand over when</p>
            <div className="space-y-3">
              {[
                "Customer asks to speak to a person",
                "Bot is unsure of the answer",
                "Bulk order over 10 items",
              ].map((rule) => (
                <label
                  key={rule}
                  className="flex items-start gap-3 text-sm leading-snug text-[#635e59]"
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-0.5 h-4 w-4 accent-[#FF8A4C]"
                  />
                  {rule}
                </label>
              ))}
            </div>
          </SettingsCard>
        </div>
      </div>
      {dirty && (
        <div className="fixed inset-x-4 bottom-20 z-30 flex items-center justify-between gap-3 rounded-2xl border border-[#e3dfdb] bg-white/95 py-3 pl-4 pr-3 shadow-[0_-4px_20px_rgba(30,28,25,.08)] backdrop-blur md:inset-x-7 lg:bottom-6 lg:left-[calc(var(--sidebar-w)+36px)] lg:right-9">
          <span className="flex items-center gap-2 text-sm font-medium text-[#5b5651]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#FF8A4C]" />
            You have unsaved changes
          </span>
          <Button
            onClick={() => {
              setDirty(false);
              setSaved(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e4e1dd] bg-white p-5">
      <div className="mb-5 flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff1e8] text-[#df6e37]">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-[#918b85]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Switch({ on, setOn }: { on: boolean; setOn: (on: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={`relative h-6 w-11 rounded-full transition ${on ? "bg-[#45a879]" : "bg-[#c8c5c1]"}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${on ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

function Field({
  label,
  placeholder,
  defaultValue,
  icon,
}: {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  icon?: IconName;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#5b5651]">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-[#dedbd7] bg-white px-3 focus-within:border-[#ed9a70] focus-within:ring-2 focus-within:ring-[#fff0e8]">
        {icon && <Icon name={icon} className="h-4 w-4 text-[#9a948e]" />}
        <input
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="min-w-0 w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[#aaa59f]"
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
          <button onClick={onClose} className="rounded-lg p-2 text-[#777] hover:bg-[#f3f1ee]">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("products");
  // Each page opens at the top; otherwise the old scroll position leaves its first rows under the sticky header.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  return (
    <AppShell page={page} setPage={setPage}>
      {page === "products" && <ProductsPage />}
      {page === "overview" && <OverviewPage onViewConversations={() => setPage("conversations")} />}
      {page === "conversations" && <ConversationsPage />}
      {page === "settings" && <SettingsPage />}
    </AppShell>
  );
}
