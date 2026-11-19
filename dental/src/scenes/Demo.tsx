// 0:12–0:24 — The live demo: a patient asks, Catalyst answers from the clinic's own price list and books the slot.
import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { Avatar, Bubble, C, DISPLAY, Eyebrow, FONT, Mark, Phone, Typing, Words, clamp01, cues, lerp, paperCard, pop, prog } from "../kit";

const D = cues.demo;

const PRICES: [string, string][] = [
  ["Consultation", "2,000"],
  ["Scaling & polishing", "4,500"],
  ["Tooth filling", "6,000"],
  ["Tooth extraction", "3,000"],
  ["Teeth whitening", "25,000"],
];
type Slot = { t: string; who?: string; what?: string; offer?: boolean };
const SLOTS: Slot[] = [
  { t: "9:00 AM", who: "Ruwan S.", what: "Filling" },
  { t: "9:30 AM", who: "Anjali D.", what: "Check-up" },
  { t: "10:30 AM", offer: true },
  { t: "11:30 AM", who: "Mohamed I.", what: "Cleaning" },
  { t: "2:00 PM", who: "Shanika L.", what: "Braces review" },
  { t: "4:00 PM", offer: true },
];

function Panel({ title, sub, children, style }: { title: string; sub: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ flex: 1, borderRadius: 20, border: `1.5px solid ${C.rule}`, background: C.white, padding: "18px 20px", ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", fontFamily: FONT, marginBottom: 12 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.char }}>{title}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.mute, letterSpacing: 0.5 }}>{sub}</span>
      </div>
      {children}
    </div>
  );
}

export function Demo() {
  const f = useCurrentFrame();
  const phone = pop(f, D.phone, 16, 110);
  const dash = pop(f, D.dash, 16, 110);
  const t1 = prog(f, D.look - 2, D.look + 4) * (1 - prog(f, D.reply - 4, D.reply));
  const t2 = prog(f, D.ask2 + 14, D.ask2 + 20) * (1 - prog(f, D.booked - 4, D.booked));
  const look = prog(f, D.look, D.look + 10);
  const offer = prog(f, D.slots, D.slots + 10);
  const fill = pop(f, D.fill, 12, 190);
  const toast = pop(f, D.toast, 14, 170) * (1 - prog(f, D.toast + 70, D.toast + 82));
  const booked = 7 + (f >= D.fill ? 1 : 0);
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);

  return (
    <>
      {/* headline over the dashboard */}
      <div style={{ position: "absolute", left: 690, top: 92, width: 1110, color: C.char }}>
        <Eyebrow style={{ opacity: prog(f, 4, 14) }}>Live demo · Tuesday 1:15 PM</Eyebrow>
        <div style={{ position: "relative", height: 150, marginTop: 14 }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <Words text="Answers from *your price list.*" light start={10} stagger={3} out={D.h2 - 12} style={{ fontFamily: DISPLAY, fontSize: 70, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05 }} />
          </div>
          <div style={{ position: "absolute", inset: 0 }}>
            <Words text="Then books it into *your diary.*" light start={D.h2} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 70, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05 }} />
          </div>
        </div>
      </div>

      {/* the patient's chat, as the clinic sees it */}
      <div style={{ position: "absolute", left: 130, top: 75, opacity: clamp01(phone * 1.4), transform: `translateY(${(1 - phone) * 200}px) rotate(${(1 - phone) * -5}deg)` }}>
        <Phone title="Nadeesha P." clock="1:15" glow={0.35 * prog(f, D.reply, D.reply + 10)}
          avatar={<Avatar label="N" size={44} bg="#4A4A4A" />}
          subtitle={<span style={{ color: C.orange }}>● Catalyst is replying</span>}>
          <div style={{ marginBottom: "auto", display: "flex", justifyContent: "center" }}>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: C.soft, background: C.grey2, padding: "6px 14px", borderRadius: 9 }}>TODAY</span>
          </div>
          <Bubble side="them" time="1:15 PM" p={pop(f, D.ask, 14, 200)}>Hi! How much is scaling? Can I come on Saturday?</Bubble>
          {f < D.reply ? (
            <div style={{ height: f >= D.look - 2 ? 46 : 0 }}><Typing frame={f} p={t1} /></div>
          ) : (
            <Bubble side="me" ai time="1:15 PM" ticks p={pop(f, D.reply, 13, 190)}>
              Hi Nadeesha! Scaling &amp; polishing is <b>LKR 4,500</b>. On Saturday we have <b>10:30 AM</b> or <b>4:00 PM</b>. Which suits you?
            </Bubble>
          )}
          {f >= D.ask2 - 1 && <Bubble side="them" time="1:16 PM" p={pop(f, D.ask2, 14, 210)}>10:30 please 🙏</Bubble>}
          {f >= D.ask2 + 14 && f < D.booked && <div style={{ height: 46 }}><Typing frame={f} p={t2} /></div>}
          {f >= D.booked - 1 && (
            <Bubble side="me" ai time="1:16 PM" ticks p={pop(f, D.booked, 13, 190)}>
              You're booked ✓ <b>Saturday 10:30 AM</b> with Dr. Fernando. See you then! 😊
            </Bubble>
          )}
        </Phone>
      </div>

      {/* the clinic's Catalyst dashboard */}
      <div style={{
        position: "absolute", left: 690, top: 300, width: 1110, height: 690, ...paperCard, overflow: "hidden", display: "flex",
        opacity: clamp01(dash * 1.4), transform: `translateY(${(1 - dash) * 120}px) perspective(2200px) rotateX(${(1 - dash) * 10}deg)`, transformOrigin: "50% 0%",
      }}>
        {/* sidebar */}
        <div style={{ width: 84, background: C.grey, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, paddingTop: 22 }}>
          <Mark size={44} />
          {[
            "M4 6h16v10H8l-4 4z", // inbox
            "M5 5h14v15H5zM5 9h14M9 3v4M15 3v4", // calendar
            "M3 7h18v11H3zM3 11h18", // payments
            "M6 4h9l3 3v13H6z M9 10h6M9 14h6", // knowledge
          ].map((d, i) => (
            <div key={i} style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: i === 1 ? "rgba(255,138,76,0.18)" : "transparent" }}>
              <svg width="26" height="26" viewBox="0 0 24 24"><path d={d} fill="none" stroke={i === 1 ? C.orange : "#A8A8A8"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, background: C.paper }}>
          {/* top bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 800, color: C.char, letterSpacing: -0.5 }}>Catalyst</span>
            <span style={{ width: 1.5, height: 26, background: C.rule }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: C.ink2 }}>Your Dental Clinic</span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 700, color: C.ink2, padding: "8px 16px", borderRadius: 999, background: C.white, border: `1.5px solid ${C.rule}` }}>
              <span style={{ width: 10, height: 10, borderRadius: 10, background: C.grey, opacity: 0.6 }} /> Dr. Fernando · with a patient
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 800, color: C.char, padding: "8px 16px", borderRadius: 999, background: C.tint, border: `1.5px solid rgba(255,138,76,0.6)` }}>
              <span style={{ width: 10, height: 10, borderRadius: 10, background: C.orange, boxShadow: `0 0 0 ${4 * pulse}px rgba(255,138,76,0.3)` }} /> AI answering
            </span>
          </div>

          <div style={{ display: "flex", gap: 16, flex: 1 }}>
            <Panel title="Price list" sub="LKR · Catalyst reads this">
              {PRICES.map(([k, v], i) => {
                const hot = i === 1 ? look : 0;
                const p = prog(f, D.dash + 10 + i * 3, D.dash + 22 + i * 3);
                return (
                  <div key={k} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", marginTop: 6, borderRadius: 14, fontFamily: FONT, position: "relative",
                    background: `rgba(255,138,76,${0.14 * hot})`, border: `1.5px solid rgba(255,138,76,${0.7 * hot})`,
                    opacity: p, transform: `translateX(${(1 - p) * -24}px)`,
                  }}>
                    <span style={{ color: C.char, fontSize: 21, fontWeight: 700 }}>{k}</span>
                    {i === 1 && <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.char, background: C.orange, padding: "3px 8px", borderRadius: 6, opacity: hot, transform: `scale(${0.7 + 0.3 * hot})` }}>USED IN REPLY</span>}
                    <span style={{ marginLeft: "auto", color: C.char, fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}</span>
                  </div>
                );
              })}
              <div style={{ marginTop: 14, fontFamily: FONT, fontSize: 16, fontWeight: 600, color: C.mute }}>Open Mon–Sat 9 AM–6 PM · Sun 9 AM–1 PM</div>
            </Panel>

            <Panel title="Saturday 21 Nov" sub="Dr. Fernando · Chair 2">
              {SLOTS.map((s, i) => {
                const p = prog(f, D.dash + 14 + i * 3, D.dash + 26 + i * 3);
                const isBook = s.t === "10:30 AM";
                const off = s.offer ? offer * (isBook ? 1 - clamp01(fill) : 1) : 0;
                const fl = isBook ? clamp01(fill) : 0;
                const gone = s.t === "4:00 PM" ? prog(f, D.fill, D.fill + 10) : 0;
                return (
                  <div key={s.t} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, fontFamily: FONT, opacity: p, transform: `translateX(${(1 - p) * 24}px)` }}>
                    <span style={{ width: 92, fontSize: 17, fontWeight: 700, color: C.mute, fontVariantNumeric: "tabular-nums" }}>{s.t}</span>
                    <div style={{
                      flex: 1, height: 52, borderRadius: 12, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", position: "relative", overflow: "hidden",
                      background: s.who ? "#F0EFED" : C.white,
                      border: s.who ? "1.5px solid transparent" : `1.5px dashed rgba(${off > 0 ? "255,138,76" : "26,26,26"},${off > 0 ? 0.4 + 0.5 * off * (1 - gone) : 0.18})`,
                    }}>
                      {s.who ? (
                        <><span style={{ width: 5, height: 26, borderRadius: 4, background: "#BEBEBE" }} /><span style={{ fontSize: 18, fontWeight: 700, color: C.ink2 }}>{s.who}</span><span style={{ fontSize: 16, color: C.mute, fontWeight: 600 }}>· {s.what}</span></>
                      ) : (
                        <span style={{ fontSize: 16, fontWeight: 700, color: off > 0 && gone < 1 ? C.ember : C.mute, letterSpacing: 0.5 }}>{off > 0.01 && gone < 1 ? "Free · offered by Catalyst" : "Free"}</span>
                      )}
                      {fl > 0 && (
                        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, ${C.orange}, #FF9F6B)`, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", clipPath: `inset(0 ${(1 - fl) * 100}% 0 0 round 12px)` }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: C.char }}>Nadeesha P.</span>
                          <span style={{ fontSize: 16, color: C.char, fontWeight: 600, opacity: 0.75 }}>· Scaling</span>
                          <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, letterSpacing: 1, color: C.orange, background: C.char, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>AI ✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Panel>
          </div>

          {/* today strip */}
          <div style={{ display: "flex", gap: 14, fontFamily: FONT }}>
            {([["Chats answered today", String(Math.round(lerp(0, 31, prog(f, D.dash + 20, D.dash + 50))))], ["Booked by AI today", String(booked)], ["Waiting for you", "0"]] as [string, string][]).map(([k, v], i) => (
              <div key={k} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderRadius: 14, background: i === 1 ? C.char : C.white, border: `1.5px solid ${i === 1 ? C.char : C.rule}` }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: i === 1 ? C.soft : C.mute }}>{k}</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 800, color: i === 1 ? C.orange : C.char, fontVariantNumeric: "tabular-nums", transform: i === 1 ? `scale(${1 + 0.3 * Math.max(0, 1 - Math.abs(f - D.fill - 4) / 8)})` : undefined }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      {/* toast */}
      <div style={{
        position: "absolute", left: 1440, top: 236, zIndex: 5, display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderRadius: 16, background: C.char, color: C.white, fontFamily: FONT,
        boxShadow: "0 24px 50px -20px rgba(0,0,0,0.6)", opacity: clamp01(toast * 1.4), transform: `translateY(${(1 - toast) * -30}px) scale(${0.9 + 0.1 * toast})`,
      }}>
        <span style={{ width: 34, height: 34, borderRadius: 34, background: C.orange, display: "grid", placeItems: "center", color: C.char, fontSize: 20, fontWeight: 900 }}>✓</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>New booking · Sat 10:30 AM</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.soft }}>Nadeesha P. · added by Catalyst</div>
        </div>
      </div>
    </>
  );
}
