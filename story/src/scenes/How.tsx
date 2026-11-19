// 0:38–0:48 — Answers only from Damsara's own list. Not on the list? It doesn't guess; it hands off.
import { useCurrentFrame } from "remotion";
import { Avatar, Bubble, C, FONT, Headline, Mark, Words, card, clamp01, cues, pop, prog } from "../kit";

const HW = cues.how;
const ROWS: [string, string][] = [["Bag", "Rs. 3,200"], ["කඩේ වෙලාව", "9 AM – 7 PM"], ["Delivery · Colombo", "Rs. 350"]];

function Check({ p, x }: { p: number; x?: boolean }) {
  return (
    <div style={{ width: 52, height: 52, borderRadius: 52, background: x ? "rgba(255,255,255,0.1)" : "rgba(255,138,76,0.16)", border: `2px solid ${x ? "rgba(255,255,255,0.35)" : C.orange}`, display: "grid", placeItems: "center", transform: `scale(${p})`, flexShrink: 0 }}>
      <svg width="26" height="26" viewBox="0 0 24 24">
        {x ? <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="3" strokeLinecap="round" /> : <path d="M5 12.5l4.5 4.5L19 7.5" stroke={C.orange} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </div>
  );
}

export function How() {
  const f = useCurrentFrame();
  const listIn = pop(f, 10, 16, 120);
  const feed = prog(f, HW.feed, HW.feed + 40);
  const scan = prog(f, HW.scan, HW.scan + 26);
  const scanning = f >= HW.scan && f < HW.scan + 30;
  const stamp = pop(f, HW.stamp, 10, 240);
  const handoff = pop(f, HW.handoff, 14, 160);
  const nodePulse = Math.max(0, 1 - Math.abs(f - (HW.feed + 30)) / 18);

  return (
    <>
      <Headline top={206} style={{ fontSize: 56 }}>
        <Words text={'GA"DAMSARA දෙන *මිල, වෙලාව, delivery* විස්තර වලින්ම උත්තර දෙනවා.'} start={6} stagger={3} out={HW.ask - 10} />
      </Headline>
      <Headline top={206} style={{ fontSize: 46 }}>
        <Words text="ලිස්ට් එකේ නැති දෙයක් ඇහුවොත්," start={HW.ask + 2} style={{ color: "#D8D8D8", fontWeight: 700 }} />
        <Words text="Catalyst *හිතලා කියන්නේ නෑ.*" start={HW.scan + 8} stagger={4} style={{ fontSize: 64, fontWeight: 900, marginTop: 6 }} />
      </Headline>

      {/* Damsara's list */}
      <div style={{
        position: "absolute", left: 80, right: 80, top: 590, padding: "30px 40px 24px", ...card,
        opacity: Math.min(1, listIn * 1.4), transform: `translateY(${(1 - listIn) * 80}px)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT, color: C.white, marginBottom: 16 }}>
          <svg width="42" height="42" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke={C.orange} strokeWidth="2" /><path d="M8 8h8M8 12h8M8 16h5" stroke={C.orange} strokeWidth="2" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 36, fontWeight: 800 }}>{'GA"DAMSARA ගේ ලිස්ට් එක'}</span>
          <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 700, color: C.mute, letterSpacing: 3 }}>SAMPLE</span>
        </div>
        {ROWS.map(([k, v], i) => {
          const p = pop(f, HW.rows[i], 14, 200);
          const glow = Math.max(0, 1 - Math.abs(f - (HW.feed + i * 6)) / 14);
          return (
            <div key={k} style={{
              display: "flex", alignItems: "center", gap: 22, padding: "20px 22px", marginTop: 12, borderRadius: 24,
              background: `rgba(255,138,76,${0.04 + 0.16 * glow})`, border: `1.5px solid rgba(255,255,255,${0.06 + 0.2 * glow})`,
              opacity: clamp01(p * 1.6), transform: `translateX(${(1 - p) * -60}px)`, fontFamily: FONT,
            }}>
              <Check p={p} />
              <span style={{ color: C.white, fontSize: 36, fontWeight: 600 }}>{k}</span>
              <span style={{ marginLeft: "auto", color: C.orange, fontSize: 38, fontWeight: 800 }}>{v}</span>
            </div>
          );
        })}
        {/* scan beam */}
        {scanning && (
          <div style={{ position: "absolute", left: 20, right: 20, top: 90 + scan * 300, height: 6, borderRadius: 6, background: C.white, boxShadow: `0 0 30px 8px rgba(255,255,255,0.35)`, opacity: 0.8 * (1 - scan * 0.4) }} />
        )}
        {/* not on the list */}
        <div style={{
          position: "absolute", right: 40, bottom: -46, display: "flex", alignItems: "center", gap: 16,
          padding: "16px 28px", borderRadius: 22, background: "#111", border: "3px solid rgba(255,255,255,0.85)",
          fontFamily: FONT, color: C.white, fontSize: 34, fontWeight: 800,
          opacity: clamp01(stamp * 1.5), transform: `rotate(-6deg) scale(${2 - stamp})`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        }}>
          <Check p={1} x /> ලිස්ට් එකේ නෑ
        </div>
      </div>

      {/* feed line: list → agent */}
      <svg width="1080" height="200" style={{ position: "absolute", left: 0, top: 1010 }}>
        <defs>
          <linearGradient id="feed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.orange} stopOpacity="0" /><stop offset="1" stopColor={C.orange} /></linearGradient>
        </defs>
        <line x1="540" y1="40" x2="540" y2="130" stroke="rgba(255,255,255,0.14)" strokeWidth="3" strokeDasharray="6 10" />
        <line x1="540" y1="40" x2="540" y2={40 + 90 * feed} stroke="url(#feed)" strokeWidth="5" strokeLinecap="round" opacity={feed < 1 ? 1 : 0.5} />
        {[0, 1, 2].map((k) => {
          const d = ((f - HW.feed - k * 9) % 40) / 40;
          return f > HW.feed && f < HW.ask + 20 ? <circle key={k} cx="540" cy={40 + d * 90} r={6} fill={C.orange} opacity={1 - d} /> : null;
        })}
      </svg>
      <div style={{ position: "absolute", left: 540, top: 1196, transform: `translate(-50%, -50%) scale(${pop(f, HW.feed - 6) * (1 + 0.12 * nodePulse)})` }}>
        <div style={{ width: 128, height: 128, borderRadius: 128, background: "#141414", border: `3px solid ${C.orange}`, display: "grid", placeItems: "center", boxShadow: `0 0 ${40 + 60 * nodePulse}px rgba(255,138,76,0.45)` }}>
          <Mark size={70} />
        </div>
      </div>

      {/* the conversation */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 1290, display: "flex", flexDirection: "column", gap: 22 }}>
        <Bubble side="them" time="3:40 PM" p={pop(f, HW.ask, 14, 200)}>Blue colour eka thiyenawada?</Bubble>
        <Bubble side="me" time="3:40 PM" ticks p={pop(f, HW.reply, 14, 200)}>{'GA"DAMSARA අයියාගෙන් අහලා කියන්නම්.'}</Bubble>
        <div style={{
          alignSelf: "center", marginTop: 14, display: "flex", alignItems: "center", gap: 18, padding: "14px 30px 14px 16px", borderRadius: 999,
          background: "rgba(255,138,76,0.12)", border: "2px solid rgba(255,138,76,0.6)",
          opacity: clamp01(handoff * 1.5), transform: `scale(${0.7 + 0.3 * handoff})`,
          fontFamily: FONT, color: C.white, fontSize: 32, fontWeight: 700,
        }}>
          <Mark size={52} />
          <svg width="60" height="24" viewBox="0 0 60 24"><path d="M2 12h50M42 3l10 9-10 9" stroke={C.orange} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="70" strokeDashoffset={70 * (1 - prog(f, HW.handoff + 4, HW.handoff + 20))} /></svg>
          <Avatar label="G" size={52} bg={C.white} fg={C.char} />
          <span><span style={{ color: C.orange }}>hand off</span> {'GA"DAMSARA ට'}</span>
        </div>
      </div>
    </>
  );
}
