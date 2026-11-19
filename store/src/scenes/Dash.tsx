// 0:48–0:56. The Catalyst dashboard (same look as web/: navy sidebar, gold accent, Inter, editable table),
// with an "Items" page for a department store. Change one price, ask the same question again, get the new price.
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { Bubble, C, Caption, Chat, Cursor, Dots, FONT, clamp01, cues, ease, lerp, pop, prog } from "../kit";

const D = cues.dash;
const OLD = "6,950";
const NEW = "5,950";

// web/src/styles.css tokens
const T = {
  font: `"Inter", "Noto Sans Sinhala", "Segoe UI", sans-serif`,
  navy: "#0b1220", navyLine: "#1f2b45", onNavy: "#c9d0dc", onNavy2: "#8b95a7",
  gold: "#f5a524", goldRing: "rgba(245,165,36,0.35)",
  bg: "#f7f8fa", surface: "#ffffff", border: "#e5e7eb", borderStrong: "#d1d5db",
  text: "#111827", text2: "#6b7280", text3: "#8b929e",
  green: "#15803d", greenSoft: "#dcfce7", orangeText: "#c2410c", orangeSoft: "#ffedd5",
};

// Glyph paths from web/src/Glyph.tsx
const GLYPH: Record<string, ReactNode> = {
  grid: (<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
  chat: <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17H10l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z" />,
  list: <path d="M8.5 7h11M8.5 12h11M8.5 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />,
  wallet: (<><rect x="3.5" y="6" width="17" height="13" rx="2" /><path d="M3.5 10h17M15.5 14.5h2" /></>),
  settings: (<><path d="M5 7h9M18 7h1M5 17h1M10 17h9" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /><path d="M5 12h3M12 12h7" /><circle cx="10" cy="12" r="2" /></>),
};
const Glyph = ({ name, size = 28 }: { name: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{GLYPH[name]}</svg>
);
const Logo = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill={T.gold} /><path d="M10.5 10.5l11 11M21.5 10.5l-11 11" stroke={T.navy} strokeWidth="2.6" strokeLinecap="round" /></svg>
);

const NAV: [string, string][] = [["grid", "Overview"], ["chat", "Conversations"], ["list", "Items"], ["wallet", "Payments"], ["settings", "Settings"]];

type Item = { name: string; stock: "New" | "Old"; note: string; price: string };
const ITEMS: Item[] = [
  { name: "Men's Black Sports Shoe", stock: "New", note: "Sizes 39–44", price: OLD },
  { name: "Brown Leather Sandal", stock: "Old", note: "Staff confirm sizes", price: "4,200" },
  { name: "Canvas Tote Bag", stock: "New", note: "One size", price: "1,790" },
];

// window geometry (scene coordinates); the cursor aims at the first price field
const WIN = { x: 70, y: 405, w: 940, h: 575 };
const TARGET = { x: 712, y: 628 };

export function Dash() {
  const f = useCurrentFrame();
  const win = pop(f, D.in + 2, 16, 110);
  const chat = pop(f, D.saved + 8, 16, 120);

  // cursor: travel to the price field, click, then over to Save and click it
  const mv = prog(f, D.cursor, D.click - 4, ease);
  const toSave = prog(f, D.type + 10, D.saved - 8);
  const cx = f < D.type ? lerp(980, TARGET.x, mv) : lerp(TARGET.x, 912, toSave);
  const cy = f < D.type ? lerp(1150, TARGET.y, mv) : TARGET.y;
  const saveDown = f >= D.saved - 6 && f < D.saved;
  const press = (f >= D.click && f < D.click + 5) || saveDown ? 0.86 : 1;
  const cursorOn = clamp01(prog(f, D.cursor - 6, D.cursor + 2)) * (1 - prog(f, D.saved + 6, D.saved + 14));

  let price = OLD;
  if (f >= D.erase) price = OLD.slice(0, Math.max(0, OLD.length - Math.floor((f - D.erase) / 2)));
  if (f >= D.type) price = NEW.slice(0, Math.min(NEW.length, 1 + Math.floor((f - D.type) / 3)));
  const focused = f >= D.click && f < D.saved;
  const dirty = f >= D.erase && f < D.saved;
  const saved = pop(f, D.saved, 13, 180);
  const caret = focused && Math.floor(f / 8) % 2 === 0;

  return (
    <>
      <Caption eyebrow="Your dashboard" text="Change a price. *The bot uses it.*" />

      {/* browser window with the Catalyst dashboard */}
      <div style={{
        position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 26, overflow: "hidden",
        background: T.bg, border: `2px solid ${T.border}`, boxShadow: "0 40px 80px -36px rgba(11,18,32,0.5)",
        display: "flex", flexDirection: "column", fontFamily: T.font, color: T.text,
        opacity: clamp01(win * 1.4), transform: `translateY(${(1 - win) * 160}px)`,
      }}>
        <div style={{ height: 50, flex: "none", background: "#eceef1", display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: `1px solid ${T.border}` }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: 14, background: c }} />)}
          <span style={{ marginLeft: 18, padding: "5px 18px", borderRadius: 10, background: T.surface, fontSize: 19, fontWeight: 500, color: T.text2 }}>Catalyst dashboard</span>
        </div>
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* sidebar */}
          <div style={{ width: 236, flex: "none", background: T.navy, borderRight: `1px solid ${T.navyLine}`, padding: "22px 12px", display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px" }}>
              <Logo />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Catalyst</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: T.onNavy2 }}>by AlchemyX</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV.map(([g, label]) => {
                const on = label === "Items";
                return (
                  <div key={label} style={{
                    position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10,
                    background: on ? "rgba(245,165,36,0.12)" : "transparent", color: on ? T.gold : T.onNavy, fontSize: 21, fontWeight: on ? 600 : 500,
                  }}>
                    {on && <span style={{ position: "absolute", left: -12, top: 10, bottom: 10, width: 4, borderRadius: "0 4px 4px 0", background: T.gold }} />}
                    <Glyph name={g} size={26} />{label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* main */}
          <div style={{ flex: 1, padding: "24px 24px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            <div>
              <div style={{ fontSize: 38, fontWeight: 650, letterSpacing: -0.5 }}>Items</div>
              <div style={{ fontSize: 21, color: T.text2, marginTop: 4 }}>What the bot sells. Changes apply to the next message.</div>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 18px 6px", boxShadow: "0 1px 2px rgba(11,18,32,0.05)" }}>
              <div style={{ display: "flex", fontSize: 19, fontWeight: 600, color: T.text3, padding: "0 4px 10px", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ flex: 1 }}>Item</span><span style={{ width: 170, textAlign: "right" }}>Price (LKR)</span><span style={{ width: 98 }} />
              </div>
              {ITEMS.map((it, i) => {
                const first = i === 0;
                const val = first ? price : it.price;
                return (
                  <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 4px", borderTop: i ? `1px solid ${T.border}` : undefined }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 27, fontWeight: 600, whiteSpace: "nowrap" }}>{it.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 19, color: T.text2, whiteSpace: "nowrap" }}>
                        <span style={{ height: 30, padding: "0 10px", borderRadius: 7, display: "inline-flex", alignItems: "center", fontWeight: 600, fontSize: 18, color: it.stock === "New" ? T.green : T.orangeText, background: it.stock === "New" ? T.greenSoft : T.orangeSoft }}>{it.stock} stock</span>
                        {it.note}
                      </div>
                    </div>
                    <div style={{
                      width: 170, height: 58, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 14px",
                      fontSize: 29, fontWeight: 600, fontVariantNumeric: "tabular-nums", background: first && f >= D.saved ? `rgba(220,252,231,${saved})` : T.surface,
                      border: `1.5px solid ${first && focused ? T.gold : T.borderStrong}`, boxShadow: first && focused ? `0 0 0 4px ${T.goldRing}` : undefined,
                    }}>
                      {val}{first && caret && <span style={{ width: 2.5, height: 30, background: T.text, marginLeft: 2 }} />}
                    </div>
                    <div style={{ width: 88, display: "flex", justifyContent: "flex-end" }}>
                      {first && dirty && (
                        <span style={{ height: 44, padding: "0 16px", borderRadius: 10, display: "inline-flex", alignItems: "center", background: saveDown ? "#e09316" : T.gold, color: T.navy, fontSize: 21, fontWeight: 600, transform: `scale(${saveDown ? 0.94 : 1})` }}>Save</span>
                      )}
                      {first && f >= D.saved && <span style={{ fontSize: 21, fontWeight: 600, color: T.green, opacity: clamp01(saved * 1.4), whiteSpace: "nowrap" }}>Saved ✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* "bot updated" toast, in the video's own style */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 948, display: "flex", justifyContent: "center", zIndex: 6,
        opacity: clamp01(saved * 1.4), transform: `translateY(${(1 - saved) * -20}px) scale(${0.9 + 0.1 * saved})`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 30px", borderRadius: 999, background: C.char, color: C.white, fontFamily: FONT, fontSize: 32, fontWeight: 800, boxShadow: "0 24px 50px -20px rgba(0,0,0,0.6)" }}>
          <span style={{ width: 42, height: 42, borderRadius: 42, background: C.orange, color: C.char, display: "grid", placeItems: "center", fontSize: 26 }}>✓</span>
          Saved. The bot uses it now.
        </div>
      </div>

      <Cursor x={cx} y={cy} opacity={cursorOn} press={press} />

      {/* the same question, asked again */}
      <div style={{ position: "absolute", left: 70, top: 1050, opacity: clamp01(chat * 1.4), transform: `translateY(${(1 - chat) * 200}px)` }}>
        <Chat bezel={false} composer={false} height={700} subtitle="Same question, after the change">
          <Bubble side="them" time="4:31 PM" p={pop(f, D.ask, 14, 200)} fs={42}>Shoe eka price eka kiyada? 👟</Bubble>
          <Dots f={f} from={D.typing} to={D.reply} />
          {f >= D.reply && (
            <Bubble side="me" ai time="4:31 PM" p={pop(f, D.reply, 13, 190)} fs={42}>
              Men's Black Sports Shoe eka <br /><b style={{ background: C.char, color: C.orange, padding: "0 12px", borderRadius: 8, whiteSpace: "nowrap" }}>Rs. {NEW}</b> 😊
            </Bubble>
          )}
        </Chat>
      </div>
    </>
  );
}
