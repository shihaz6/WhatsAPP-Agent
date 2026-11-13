import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Avatar, C, DISPLAY, Icon, Mark, RiseLines, TEXT, cues, progress, useOrient } from "../kit";

// The dashboard as an exploded 3D stack: Payments, Bookings, AI chats, Inbox drop in on the beat,
// float with their labels, then fold flat into one screen.
const B = cues.build;
const W = 1000, H = 620;
const LAYERS = [
  { key: "payments", label: "Payments, tracked", icon: "wallet" },
  { key: "bookings", label: "Bookings, scheduled", icon: "calendar" },
  { key: "ai", label: "AI chats, any language", icon: "spark" },
  { key: "inbox", label: "Every WhatsApp, one inbox", icon: "inbox" },
] as const;
const NAV = [
  { key: "inbox", label: "Inbox", icon: "inbox" },
  { key: "ai", label: "AI chats", icon: "spark" },
  { key: "bookings", label: "Bookings", icon: "calendar" },
  { key: "payments", label: "Payments", icon: "wallet" },
];

export function Build() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, pick3 } = useOrient();
  const fold = progress(frame, B.fold, B.folded, Easing.inOut(Easing.cubic));
  const rx = 56 * (1 - fold), rz = -36 * (1 - fold);
  const gap = 150 * (1 - fold);
  const scale = pick3(1, 0.86, 0.8) * interpolate(frame, [0, B.fold, B.folded, 192], [0.88, 1, 1.22, 1.28], { extrapolateRight: "clamp" });
  const exit = progress(frame, 180, 192, Easing.in(Easing.cubic));
  const centerY = pick3(640, 1020, 720);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 60%, rgba(255,138,76,0.16), transparent 55%)" }} />
      <div style={{ position: "absolute", left: pick3(120, 70, 70), top: pick3(80, 180, 60), opacity: 1 - exit }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: "0.22em", color: C.orange, opacity: progress(frame, 0, 12) }}>THE CATALYST DASHBOARD</div>
        <RiseLines start={4} gap={6} lines={["Everything in", "one place."]}
          style={{ marginTop: 10, fontFamily: DISPLAY, fontWeight: 800, fontSize: pick3(80, 96, 80), lineHeight: 1.02, letterSpacing: "-0.04em", color: C.white }} />
      </div>

      <div style={{ position: "absolute", left: "50%", top: centerY, width: 0, height: 0, perspective: fold >= 1 ? undefined : 2600, opacity: 1 - exit }}>
        <div style={{ position: "absolute", left: pick3(-60 + 290 * fold, 0, 0), top: 0, transformStyle: fold >= 1 ? "flat" : "preserve-3d", transform: fold >= 1 ? `scale(${scale})` : `scale(${scale}) rotateX(${rx}deg) rotateZ(${rz}deg)` }}>
          {LAYERS.map((l, i) => {
            const d = spring({ frame: frame - B.drops[i], fps, config: { damping: 14, stiffness: 120, mass: 0.9 } });
            if (frame < B.drops[i]) return null;
            const z = (i - 1.5) * gap + (1 - d) * 700;
            const top = i === LAYERS.length - 1;
                        return (
              <div key={l.key} style={{
                position: "absolute", left: -W / 2, top: -H / 2, width: W, height: H, transform: `translateZ(${z}px)`, opacity: Math.min(1, d * 1.5),
                transformStyle: "preserve-3d",
              }}>
                <Window active={l.key} glow={!top || fold < 1} dim={!top && fold > 0.6 ? 0 : 1}>
                  {l.key === "inbox" && <InboxView />}
                  {l.key === "ai" && <AiView />}
                  {l.key === "bookings" && <BookingsView />}
                  {l.key === "payments" && <PaymentsView />}
                </Window>
              </div>
            );
          })}
        </div>
      </div>
      {/* what each layer is */}
      <div style={{
        position: "absolute", display: "flex", flexDirection: "column", gap: pick3(22, 16, 12), opacity: 1 - fold,
        ...(portrait ? { left: 70, right: 70, bottom: pick3(0, 380, 50) } : { right: 110, top: 0, bottom: 0, justifyContent: "center" }),
      }}>
        {[...LAYERS].reverse().map((l) => {
          const i = LAYERS.indexOf(l);
          const p = spring({ frame: frame - B.drops[i] - 6, fps, config: { damping: 14, stiffness: 160 } });
          return (
            <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 18, opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * 40}px)` }}>
              <span style={{ width: pick3(64, 60, 52), height: pick3(64, 60, 52), borderRadius: 18, background: C.orange, display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name={l.icon} size={pick3(32, 30, 26)} color={C.ink} />
              </span>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: pick3(36, 40, 34), color: C.white, letterSpacing: "-0.02em" }}>{l.label}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function Window({ active, children, glow, dim }: { active: string; children: ReactNode; glow: boolean; dim: number }) {
  return (
    <div style={{
      width: W, height: H, borderRadius: 28, background: "#202020", overflow: "hidden", display: "flex", flexDirection: "column",
      border: `2px solid ${glow ? "rgba(255,138,76,0.55)" : "#333"}`, boxShadow: "0 50px 100px -30px rgba(0,0,0,0.8)", opacity: dim ? 1 : 0.0,
    }}>
      <div style={{ height: 40, flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "0 16px", background: "#151515", borderBottom: "1px solid #333" }}>
        {[0, 1, 2].map((k) => <span key={k} style={{ width: 12, height: 12, borderRadius: 6, background: "#444" }} />)}
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ width: 200, flex: "none", background: "#181818", borderRight: "1px solid #333", padding: "20px 12px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 18px" }}>
            <Mark size={32} bg={C.orange} fg={C.ink} />
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 21, color: C.white, letterSpacing: "-0.03em" }}>Catalyst</span>
          </div>
          {NAV.map((n) => {
            const on = n.key === active;
            return (
              <div key={n.key} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 11, fontFamily: TEXT, fontWeight: 600, fontSize: 16,
                background: on ? "#2E2E2E" : "transparent", color: on ? C.white : C.muteDark, boxShadow: on ? `inset 3px 0 0 ${C.orange}` : undefined,
              }}><Icon name={n.icon} size={18} />{n.label}</div>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: "22px 24px", boxSizing: "border-box" }}>{children}</div>
      </div>
    </div>
  );
}

const h2 = (t: string, right?: ReactNode) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, color: C.white, letterSpacing: "-0.03em" }}>{t}</span>
    {right && <span style={{ fontFamily: TEXT, fontWeight: 600, fontSize: 14, color: C.muteDark }}>{right}</span>}
  </div>
);
const pill = (t: string, hot = false) => (
  <span style={{ fontFamily: TEXT, fontWeight: 700, fontSize: 12.5, borderRadius: 999, padding: "4px 11px", background: hot ? C.orange : "#333", color: hot ? C.ink : C.orange, whiteSpace: "nowrap" }}>{t}</span>
);

function InboxView() {
  const rows = [
    ["Amal Perera", "Viewing booked · Sat 10:30", "Booked", true],
    ["Nimal's mum", "Grade 10 fees kiyada?", "AI replied", false],
    ["Kavitha S.", "Galle ku delivery irukka?", "AI replied", false],
    ["Fathima N.", "Table for 4 tonight?", "AI replied", false],
    ["Ruwan J.", "Can I talk to the owner?", "Needs you", true],
    ["Dilani P.", "Thank you! See you then", "AI replied", false],
  ] as const;
  return (
    <div>
      {h2("Inbox", "0 waiting · 128 today")}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(([n, p, s, hot], k) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 12px", borderRadius: 14, background: k === 0 ? "#2E2E2E" : "transparent" }}>
            <Avatar text={n.split(" ").map((x) => x[0]).join("").slice(0, 2)} size={42} bg={k === 0 ? C.orange : "#3A3A3A"} fg={k === 0 ? C.ink : C.white} />
            <div style={{ flex: 1, minWidth: 0, fontFamily: TEXT }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.white }}>{n}</div>
              <div style={{ fontWeight: 500, fontSize: 14, color: C.muteDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p}</div>
            </div>
            {pill(s, hot)}
          </div>
        ))}
      </div>
    </div>
  );
}

function AiView() {
  const b = (mine: boolean, t: string) => (
    <div style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%", background: mine ? C.orange : "#2E2E2E", color: mine ? C.ink : C.white, borderRadius: 16, padding: "11px 15px", fontFamily: TEXT, fontWeight: 600, fontSize: 16, lineHeight: 1.4 }}>{t}</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {h2("Nimal's mum", "Singlish · AI handling")}
      {b(false, "Grade 10 maths fees kiyada? Class eka kawadada?")}
      {b(true, "Masekata LKR 3,500. Class eka Saturday 8 AM. Seat ekak reserve karannada?")}
      {b(false, "Ow, karanna!")}
      {b(true, "Done! Nimal's seat is reserved for Saturday.")}
    </div>
  );
}

function BookingsView() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const blocks: Record<string, [number, number][]> = { Mon: [[0, 1]], Tue: [[1, 2]], Wed: [[0, 1], [2, 1]], Thu: [[1, 1]], Fri: [[0, 2], [3, 1]], Sat: [[0, 1], [1, 1], [2, 2]] };
  return (
    <div>
      {h2("Bookings", "23 this week")}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        {days.map((d) => (
          <div key={d}>
            <div style={{ fontFamily: TEXT, fontWeight: 700, fontSize: 14, color: C.muteDark, marginBottom: 8 }}>{d}</div>
            <div style={{ position: "relative", height: 380, background: "#262626", borderRadius: 12 }}>
              {(blocks[d] ?? []).map(([s, len], k) => (
                <div key={k} style={{ position: "absolute", left: 6, right: 6, top: 8 + s * 92, height: len * 92 - 10, borderRadius: 10, background: k % 2 ? "#3A3A3A" : C.orange, padding: 8, boxSizing: "border-box", fontFamily: TEXT, fontWeight: 700, fontSize: 12, color: k % 2 ? C.white : C.ink }}>
                  {["Viewing", "Class", "Haircut", "Consult"][(s + k) % 4]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsView() {
  const rows = [["Amal Perera", "Deposit", "10,000"], ["Nimal's mum", "Nov fees", "3,500"], ["Kavitha S.", "Order #482", "6,850"], ["Glow Salon client", "Bridal", "25,000"], ["Ruwan J.", "Rent", "85,000"]];
  return (
    <div>
      {h2("Payments", "LKR 186,500 tracked")}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(([n, f, a]) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 14, background: "#262626", fontFamily: TEXT }}>
            <Icon name="receipt" size={22} color={C.orange} />
            <span style={{ flex: 1, fontWeight: 700, fontSize: 16, color: C.white }}>{n} <span style={{ color: C.muteDark, fontWeight: 500 }}>· {f}</span></span>
            <span style={{ fontWeight: 700, fontSize: 16, color: C.white }}>LKR {a}</span>
            {pill("Slip verified", true)}
          </div>
        ))}
      </div>
    </div>
  );
}
