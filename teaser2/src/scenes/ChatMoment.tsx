import type { ReactNode } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, Dots, Icon, Mark, TEXT, progress, typed, useOrient } from "../kit";

// A big, clean chat on white: a message is typed into the composer, sent, and Catalyst answers.
// Used to open the teaser ("Who replies…?" / "I do.") and to close it ("When…?" / "Very soon.").
export type Beats = { typeFrom: number; typeTo: number; send: number; dots: number; reply: number };

export function ChatMoment({ question, reply, t, replyScale = 1, out = 0 }: {
  question: string; reply: ReactNode; t: Beats; replyScale?: number; out?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pick3 } = useOrient();
  const L = pick3(
    { w: 1300, bottom: 150, h: 128, q: 52, r: 170, label: 26 },
    { w: 960, bottom: 400, h: 124, q: 50, r: 170, label: 28 },
    { w: 960, bottom: 110, h: 116, q: 46, r: 150, label: 26 },
  );

  const draft = frame < t.send ? typed(question, frame, t.typeFrom, t.typeTo) : "";
  const sendPulse = Math.max(0, 1 - Math.abs(frame - t.send) / 6);
  const qP = spring({ frame: frame - t.send, fps, config: { damping: 15, stiffness: 170, mass: 0.7 } });
  const dP = spring({ frame: frame - t.dots, fps, config: { damping: 14, stiffness: 200, mass: 0.6 } });
  const rP = spring({ frame: frame - t.reply, fps, config: { damping: 11, stiffness: 150, mass: 0.8 } });
  const showDots = frame >= t.dots && frame < t.reply;
  const enter = progress(frame, 0, 14);

  return (
    <div style={{ position: "absolute", left: "50%", bottom: L.bottom, width: L.w, marginLeft: -L.w / 2, transform: `translateY(${out * 260}px)`, opacity: 1 - out }}>
      {/* thread */}
      <div style={{ display: "flex", flexDirection: "column", gap: 34, marginBottom: 46 }}>
        {frame >= t.send && (
          <div style={{
            alignSelf: "flex-end", maxWidth: "80%", background: C.ink, color: C.white, borderRadius: 40, borderBottomRightRadius: 12,
            padding: "26px 40px", fontFamily: TEXT, fontWeight: 600, fontSize: L.q, lineHeight: 1.25,
            opacity: Math.min(1, qP * 1.5), transform: `translateY(${(1 - qP) * (L.h + 40)}px) scale(${0.9 + 0.1 * qP})`, transformOrigin: "right bottom",
          }}>{question}</div>
        )}
        {frame >= t.dots && (
          <div style={{ alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: DISPLAY, fontWeight: 700, fontSize: L.label, letterSpacing: "0.12em", color: C.ink, opacity: Math.min(1, dP * 2) }}>
              <Mark size={L.label * 1.6} bg={C.orange} fg={C.ink} /> CATALYST AI
            </div>
            {showDots ? (
              <div style={{ background: C.orangeSoft, borderRadius: 40, borderTopLeftRadius: 12, padding: "30px 40px", transform: `scale(${dP})`, transformOrigin: "left top" }}>
                <Dots size={18} color={C.ink} />
              </div>
            ) : (
              <div style={{
                background: C.orange, color: C.ink, borderRadius: 56, borderTopLeftRadius: 14, padding: `${L.r * 0.16}px ${L.r * 0.3}px ${L.r * 0.2}px`,
                fontFamily: DISPLAY, fontWeight: 800, fontSize: L.r, lineHeight: 1, letterSpacing: "-0.045em",
                transform: `scale(${(0.7 + 0.3 * rP) * replyScale})`, transformOrigin: "left top", boxShadow: "0 40px 80px -30px rgba(255,138,76,0.7)",
              }}>{reply}</div>
            )}
          </div>
        )}
      </div>
      {/* composer */}
      <div style={{
        height: L.h, borderRadius: L.h / 2, background: C.white, border: "3px solid #E6E6E6", boxShadow: "0 30px 70px -30px rgba(26,26,26,0.35)",
        display: "flex", alignItems: "center", gap: 22, padding: "0 14px 0 26px", boxSizing: "border-box", opacity: enter, transform: `translateY(${(1 - enter) * 40}px)`,
      }}>
        <span style={{ width: L.h * 0.56, height: L.h * 0.56, borderRadius: "50%", background: C.paper, display: "grid", placeItems: "center", flex: "none" }}>
          <Icon name="plus" size={L.h * 0.3} color={C.muteLight} stroke={2.2} />
        </span>
        <div style={{ flex: 1, minWidth: 0, fontFamily: TEXT, fontWeight: 600, fontSize: L.q * 0.86, color: draft ? C.ink : "#9A9A9A", whiteSpace: "nowrap", overflow: "hidden" }}>
          {draft || "Message"}
          {frame < t.send && <span style={{ display: "inline-block", width: 4, height: L.q * 0.9, background: C.orange, marginLeft: 4, verticalAlign: "middle", opacity: Math.floor(frame / 8) % 2 ? 0.15 : 1 }} />}
        </div>
        <span style={{
          width: L.h - 28, height: L.h - 28, borderRadius: "50%", background: draft ? C.ink : "#D9D9D9", display: "grid", placeItems: "center", flex: "none",
          transform: `scale(${1 + 0.2 * sendPulse})`,
        }}>
          <Icon name="send" size={(L.h - 28) * 0.42} color={draft ? C.orange : C.white} fill={draft ? C.orange : C.white} />
        </span>
      </div>
    </div>
  );
}
