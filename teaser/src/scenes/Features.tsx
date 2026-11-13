import type { ReactNode } from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { C, DISPLAY, RiseLines, TEXT, progress, shake, useOrient } from "../kit";

// Three quick glimpses of what's coming. Title on the left (top in portrait), visual on the right (below).
function FeatureFrame({ n, dark, title, children }: { n: number; dark: boolean; title: ReactNode[]; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { portrait, feed, pick } = useOrient();
  const fg = dark ? C.white : C.ink;
  const P = feed ? { title: 80, visual: 470, visualH: 840 } : { title: 300, visual: 720, visualH: 880 };
  const label = progress(frame, 0, 14);
  return (
    <AbsoluteFill style={{ background: dark ? C.ink : C.white, overflow: "hidden" }}>
      <div style={{
        position: "absolute", left: pick(140, 80), width: pick(700, 920),
        ...(portrait ? { top: P.title } : { top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }),
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30, opacity: label }}>
          <span style={{ width: 56 * label, height: 6, borderRadius: 3, background: C.orange }} />
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(30, 34), letterSpacing: "0.2em", color: fg }}>0{n} / 03</span>
        </div>
        <RiseLines start={3} gap={5} lines={title}
          style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(90, 100), lineHeight: 1.06, letterSpacing: "-0.035em", color: fg }} />
      </div>
      <div style={{
        position: "absolute", display: "flex", alignItems: "center", justifyContent: "center",
        ...(portrait ? { left: 80, right: 80, top: P.visual, height: P.visualH } : { left: 900, right: 120, top: 0, bottom: 0 }),
      }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}

const rise = (p: number, d = 40) => ({ opacity: p, transform: `translateY(${(1 - p) * d}px)` });

// 1. Languages: one greeting after another, slot-machine style.
const LANGS = [
  { word: "Hello!", name: "English", size: [130, 140] },
  { word: "ආයුබෝවන්!", name: "Sinhala", size: [104, 112] },
  { word: "வணக்கம்!", name: "Tamil", size: [96, 104] },
  { word: "Kohomada?", name: "Singlish", size: [112, 124] },
  { word: "Epdi irukeenga?", name: "Tanglish", size: [70, 80] },
];

export function Languages() {
  const frame = useCurrentFrame();
  const { pick } = useOrient();
  const starts = LANGS.map((_, k) => 10 + k * 15);
  const active = Math.max(0, starts.filter((s) => frame >= s).length - 1);
  const card = progress(frame, 2, 20);
  return (
    <FeatureFrame n={1} dark={false} title={["Replies in", "5 languages."]}>
      <div style={{
        width: "100%", height: pick(540, 640), background: C.ink, borderRadius: 44, ...rise(card, 60),
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34,
        boxShadow: "0 50px 90px -40px rgba(26,26,26,0.55)",
      }}>
        <div style={{ fontFamily: TEXT, fontWeight: 600, fontSize: pick(30, 34), color: C.muteDark, letterSpacing: "0.04em" }}>Replying in their language</div>
        <div style={{ position: "relative", width: "100%", height: pick(190, 210), overflow: "hidden" }}>
          {LANGS.map((l, k) => {
            const p = progress(frame, starts[k], starts[k] + 9, Easing.bezier(0.3, 0, 0.2, 1));
            const q = k < LANGS.length - 1 ? progress(frame, starts[k + 1], starts[k + 1] + 9, Easing.bezier(0.3, 0, 0.2, 1)) : 0;
            if (p === 0 || q === 1) return null;
            return (
              <div key={k} style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                transform: `translateY(${(1 - p) * 100 - q * 100}%)`, opacity: p * (1 - q),
                fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(l.size[0], l.size[1]), color: C.white, letterSpacing: "-0.02em", whiteSpace: "nowrap",
              }}>{l.word}</div>
            );
          })}
        </div>
        <div style={{ background: C.orange, color: C.ink, fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(36, 40), padding: "12px 36px", borderRadius: 999 }}>
          {LANGS[active].name}
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {LANGS.map((_, k) => (
            <span key={k} style={{ width: k === active ? 40 : 14, height: 14, borderRadius: 7, background: k === active ? C.orange : "#4A4A4A" }} />
          ))}
        </div>
      </div>
    </FeatureFrame>
  );
}

// 2. Hand-off: the parent asks for the teacher, the switch flips from Assistant to You.
export function Handoff() {
  const frame = useCurrentFrame();
  const { pick } = useOrient();
  const W = pick(700, 920);
  const flip = progress(frame, 30, 44, Easing.bezier(0.6, 0, 0.2, 1));
  const knobW = W / 2 - 12;
  const bubble = (bg: string, fg: string, side: "left" | "right", who: string, text: string, at: number) => {
    const p = progress(frame, at, at + 16);
    return (
      <div style={{ alignSelf: side === "left" ? "flex-start" : "flex-end", maxWidth: "88%", ...rise(p, 30) }}>
        <div style={{ fontFamily: TEXT, fontWeight: 600, fontSize: pick(26, 30), color: C.muteDark, marginBottom: 10, textAlign: side }}>{who}</div>
        <div style={{
          background: bg, color: fg, fontFamily: TEXT, fontWeight: 600, fontSize: pick(38, 42), lineHeight: 1.3,
          padding: "22px 30px", borderRadius: 28, [side === "left" ? "borderTopLeftRadius" : "borderTopRightRadius"]: 8,
        }}>{text}</div>
      </div>
    );
  };
  return (
    <FeatureFrame n={2} dark title={["Steps aside", "when you", "step in."]}>
      <div style={{ width: W, display: "flex", flexDirection: "column", gap: pick(40, 54) }}>
        {bubble(C.white, C.ink, "left", "Parent", "Can I talk to the teacher?", 6)}
        <div style={{ ...rise(progress(frame, 14, 30), 30) }}>
          <div style={{ position: "relative", width: W, height: pick(120, 132), borderRadius: 999, background: C.card, border: `2px solid ${C.line}`, boxSizing: "border-box" }}>
            <div style={{
              position: "absolute", top: 8, bottom: 8, left: 8 + flip * (W / 2 - 4), width: knobW - 4, borderRadius: 999, background: C.orange,
              boxShadow: "0 10px 30px -10px rgba(255,138,76,0.7)",
            }} />
            {["Assistant", "You"].map((label, i) => {
              const on = i === (flip > 0.5 ? 1 : 0);
              return (
                <div key={label} style={{
                  position: "absolute", top: 0, bottom: 0, left: i ? W / 2 : 0, width: W / 2, display: "grid", placeItems: "center",
                  fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(40, 44), color: on ? C.ink : C.muteDark,
                }}>{label}</div>
              );
            })}
          </div>
        </div>
        {bubble(C.orange, C.ink, "right", "You", "Hi! It's your teacher here.", 50)}
      </div>
    </FeatureFrame>
  );
}

// 3. Payments: a slip comes in, APPROVED stamps onto it.
export function Payments() {
  const frame = useCurrentFrame();
  const { pick } = useOrient();
  const card = progress(frame, 4, 22);
  const stamp = progress(frame, 36, 44, Easing.in(Easing.cubic));
  return (
    <FeatureFrame n={3} dark={false} title={["Every payment,", "tracked."]}>
      <div style={{ transform: shake(frame, [44], 12) }}>
      <div style={{ position: "relative", width: pick(680, 860), ...rise(card, 70) }}>
        <div style={{
          background: C.white, border: "2px solid #E6E6E6", borderRadius: 40, padding: pick("46px 52px", "54px 60px"),
          boxShadow: "0 50px 100px -40px rgba(26,26,26,0.45)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: TEXT, fontWeight: 600, fontSize: pick(30, 34), color: C.muteLight }}>
            <span>Payment slip</span><span>Bank transfer</span>
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(110, 124), letterSpacing: "-0.04em", color: C.ink, margin: "18px 0 8px" }}>LKR 4,500</div>
          <div style={{ fontFamily: TEXT, fontWeight: 500, fontSize: pick(34, 38), color: C.muteLight }}>Grade 8 · Maths · November</div>
          <div style={{ height: 2, background: "#EEEEEE", margin: pick("34px 0", "40px 0") }} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: C.ink, color: C.white, display: "grid", placeItems: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: 26 }}>NM</div>
            <span style={{ fontFamily: TEXT, fontWeight: 600, fontSize: pick(34, 38), color: C.ink }}>From Nimal's mum</span>
          </div>
        </div>
        <div style={{
          position: "absolute", right: pick(-40, -20), top: pick(-56, -64), opacity: stamp,
          transform: `rotate(-9deg) scale(${2.2 - 1.2 * stamp})`, transformOrigin: "center",
          background: C.orange, color: C.ink, borderRadius: 22, padding: "18px 34px", display: "flex", alignItems: "center", gap: 16,
          fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(54, 60), letterSpacing: "0.06em",
          boxShadow: "0 20px 40px -16px rgba(26,26,26,0.5)",
        }}>
          <svg width={pick(50, 56)} height={pick(50, 56)} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill={C.ink} /><path d="M7 12.5l3.2 3.2L17 9" stroke={C.orange} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          APPROVED
        </div>
      </div>
      </div>
    </FeatureFrame>
  );
}
