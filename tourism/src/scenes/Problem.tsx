// 0:07–0:15 — Nobody answers overnight. By morning the guest has booked somewhere else.
import { useCurrentFrame } from "remotion";
import { Bubble, C, DISPLAY, FONT, Headline, Words, card, clamp01, cues, easeIn, lerp, pop, prog } from "../kit";
import { GUESTS } from "./Hook";
import { useT } from "../i18n";

const PB = cues.problem;

export function Problem() {
  const f = useCurrentFrame();
  const { t, si } = useT();
  const aOut = prog(f, PB.chat - 14, PB.chat, easeIn);
  const clk = prog(f, PB.clock[0], PB.clock[1], (x) => x * x * (3 - 2 * x));
  const mins = Math.round(lerp(3 * 60 + 12, 7 * 60 + 30, clk));
  const hh = Math.floor(mins / 60), mm = mins % 60;
  const waited = mins - (3 * 60 + 12);
  const bIn = prog(f, PB.chat, PB.chat + 14);
  const lost = prog(f, PB.lost, PB.lost + 18);
  const stamp = pop(f, PB.lost + 6, 10, 240);

  return (
    <>
      {/* A: the night goes by, unanswered */}
      {aOut < 1 && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - aOut, filter: aOut ? `blur(${aOut * 12}px)` : undefined }}>
          <Headline top={210}>
            <Words text={t.problem.asleep} start={4} stagger={4} style={{ fontSize: 104, fontWeight: 900, letterSpacing: -2 }} />
            <Words text={t.problem.busy} start={20} style={{ fontSize: si ? 46 : 50, fontWeight: 700, color: "#D8D8D8", marginTop: 8 }} />
          </Headline>
          <div style={{ position: "absolute", left: 70, right: 70, top: 560, padding: "18px 0", ...card, opacity: prog(f, PB.list, PB.list + 14), transform: `translateY(${(1 - prog(f, PB.list, PB.list + 14)) * 50}px)` }}>
            {GUESTS.map((g, i) => {
              const unread = 1 + Math.floor(clamp01((clk - i * 0.12) * 1.2) * (3 - i));
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "20px 30px", borderTop: i ? "1px solid rgba(255,255,255,0.06)" : undefined, fontFamily: FONT }}>
                  <div style={{ width: 70, height: 70, borderRadius: 70, background: C.grey, color: C.white, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 30 }}>{g.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.white, fontSize: 30, fontWeight: 700 }}>{g.name} <span style={{ color: C.mute, fontWeight: 600, fontSize: 24 }}>· {g.city}</span></div>
                    <div style={{ color: C.mute, fontSize: 25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{unread > 1 ? "Hello? Anyone there?" : g.msg}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: C.orange, fontSize: 21, fontWeight: 700 }}>3:{12 + i * 9} AM</div>
                    <div style={{ marginTop: 6, marginLeft: "auto", width: 42, height: 42, borderRadius: 42, background: C.orange, color: C.char, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22 }}>{unread}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* the clock running */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 1100, textAlign: "center", opacity: prog(f, PB.clock[0] - 10, PB.clock[0] + 4) }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 170, fontWeight: 800, color: C.white, letterSpacing: -6, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {hh}:{String(mm).padStart(2, "0")}<span style={{ fontSize: 64, color: C.orange, marginLeft: 16, letterSpacing: 0 }}>AM</span>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, color: C.soft, marginTop: 18, display: "inline-flex", gap: 14, alignItems: "center", padding: "12px 28px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.14)" }}>
              <span style={{ width: 12, height: 12, borderRadius: 12, background: C.orange, opacity: 0.4 + 0.6 * Math.abs(Math.sin(f / 5)) }} />
              {t.problem.waited(Math.floor(waited / 60), String(waited % 60).padStart(2, "0"))}
            </div>
          </div>
        </div>
      )}

      {/* B: the morning reply is too late */}
      {f >= PB.chat && (
        <div style={{ position: "absolute", inset: 0, opacity: bIn }}>
          <Headline top={210} style={{ fontSize: si ? 70 : 76 }}>
            <Words text={t.problem.morning1} start={PB.chat + 2} />
            <Words text={t.problem.morning2} start={PB.chat + 14} stagger={4} style={{ fontWeight: 900 }} />
          </Headline>
          <div style={{
            position: "absolute", left: 70, right: 70, top: 500, padding: "30px 30px 34px", ...card, borderRadius: 44,
            display: "flex", flexDirection: "column", gap: 22,
            transform: `translateY(${(1 - bIn) * 60}px)`, filter: `grayscale(${lost * 0.9})`, opacity: 1 - lost * 0.3,
          }}>
            <Bubble side="them" time="3:12 AM" fs={32}>{GUESTS[0].msg}</Bubble>
            <Bubble side="me" time="7:30 AM" ticks fs={32} p={pop(f, PB.reply, 14, 200)}>Good morning! So sorry for the late reply. Yes, we have a room!</Bubble>
            <Bubble side="them" time="7:31 AM" fs={32} p={pop(f, PB.bye, 14, 200)}>Thanks, but we booked another place last night.</Bubble>
          </div>
          {/* the booking that walked */}
          <div style={{
            position: "absolute", left: 120, right: 120, top: 1270, padding: "30px 36px", borderRadius: 34,
            background: "rgba(26,26,26,0.9)", border: "2px dashed rgba(255,255,255,0.22)", fontFamily: FONT,
            opacity: prog(f, PB.lost - 8, PB.lost + 6), transform: `translateY(${(1 - prog(f, PB.lost - 8, PB.lost + 6)) * 40}px) rotate(${lost * -2}deg)`,
          }}>
            <div style={{ color: C.mute, fontSize: 24, fontWeight: 700, letterSpacing: 4 }}>BOOKING</div>
            <div style={{ color: C.white, fontSize: 38, fontWeight: 700, marginTop: 8 }}>Dec 14–16 · 2 guests</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
              <span style={{ color: C.soft, fontSize: 28 }}>Deluxe Double + pickup</span>
              <span style={{ position: "relative", fontFamily: DISPLAY, color: C.white, fontSize: 52, fontWeight: 800 }}>
                $165
                <span style={{ position: "absolute", left: -8, right: -8, top: "52%", height: 6, borderRadius: 6, background: C.orange, transformOrigin: "left", transform: `scaleX(${lost}) rotate(-6deg)` }} />
              </span>
            </div>
            <div style={{
              position: "absolute", right: -20, top: -34, padding: "10px 24px", borderRadius: 14, border: `4px solid ${C.orange}`, color: C.orange,
              fontFamily: si ? FONT : DISPLAY, fontWeight: 800, fontSize: si ? 36 : 40, letterSpacing: si ? 0 : 4, background: "rgba(20,20,20,0.95)",
              opacity: clamp01(stamp * 1.5), transform: `rotate(8deg) scale(${2.2 - 1.2 * stamp})`,
            }}>{t.problem.lost}</div>
          </div>
        </div>
      )}
    </>
  );
}
