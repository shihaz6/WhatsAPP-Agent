// Shared icons + sidebar for every Catalyst screen.
// Usage: <div id="nav" data-active="inbox"></div> then include this script.

const ICONS = {
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checks: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  tag: '<path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l8.59-8.59a1 1 0 0 0 0-1.41z"/><circle cx="7" cy="7" r="1.5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  trend: '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M20 17v5H6.5A2.5 2.5 0 0 1 4 19.5"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
};

function ic(name, cls = "") {
  return `<svg class="i ${cls}" viewBox="0 0 24 24">${ICONS[name] || ""}</svg>`;
}

function avatarStyle(seed) {
  const pairs = [
    ["#ff8a3d", "#e2540a"], ["#4c9aff", "#2d5bd7"], ["#25d366", "#128c7e"],
    ["#c86dd7", "#7b3fbf"], ["#f5b83d", "#d9822b"], ["#3dd6d0", "#1f8f9e"],
    ["#ff6f91", "#c43b6b"], ["#8e9bff", "#5560d6"],
  ];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = pairs[h % pairs.length];
  return `background:linear-gradient(135deg,${a},${b})`;
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

(function renderNav() {
  const el = document.getElementById("nav");
  if (!el) return;
  const active = el.dataset.active;
  const items = [
    ["inbox", "inbox", "Inbox", 7],
    ["train", "sparkle", "Train your AI"],
    ["analytics", "chart", "Analytics"],
    ["payments", "receipt", "Payments", 3],
    ["channels", "radio", "Channels"],
  ];
  const more = [["contacts", "users", "Contacts"], ["settings", "sliders", "Settings"]];
  const row = ([key, icon, label, count]) =>
    `<div class="nav-item ${key === active ? "active" : ""}">${ic(icon)}${label}${count ? `<span class="count">${count}</span>` : ""}</div>`;
  el.className = "nav";
  el.innerHTML = `
    <div class="brand"><div class="brand-mark">${ic("bolt")}</div>Catalyst</div>
    <div class="nav-label">Workspace</div>
    ${items.map(row).join("")}
    <div class="nav-label">Manage</div>
    ${more.map(row).join("")}
    <div class="nav-spacer"></div>
    <div class="workspace">
      <div class="ws-logo">B</div>
      <div><div class="ws-name">Bloom &amp; Co. Salon</div><div class="ws-plan">Pro plan · 3 seats</div></div>
    </div>`;
})();
