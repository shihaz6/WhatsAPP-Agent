import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Avatar, C, DISPLAY, Icon, RiseLines, TEXT, cues, progress, typed, useOrient } from "../kit";

// How it works, as a pipeline: a glowing packet travels the line and lights up four stations.
// Each station opens into a piece of the real interface.
const N = cues.flow.nodes;
const MSG = "Is the 2BR in Rajagiriya still available? Saturday balanna puluwanda?";
const REPLY = "Ow, still available! LKR 85,000 a month. Saturday 10:30 or 2:00, kumakda hondha?";
const STEPS = ["Message in", "Understood", "Replied", "Booked & paid"];

export function Flow() {
  const frame = useCurrentFrame();
  const { portrait, feed, pick3 } = useOrient();
  const L = pick3(
    { u: 1.14, card: (i: number) => ({ x: 95 + i * 440, y: 440, w: 410, h: 400 }), line: { a: 60, b: 1860, at: 370 }, title: { x: 100, y: 90 } },
    { u: 1.14, card: (i: number) => ({ x: 190, y: 420 + i * 290, w: 830, h: 272 }), line: { a: 380, b: 1560, at: 110 }, title: { x: 70, y: 170 } },
    { u: 0.96, card: (i: number) => ({ x: 170, y: 160 + i * 286, w: 850, h: 268 }), line: { a: 130, b: 1330, at: 90 }, title: null as null | { x: number; y: number } },
  );
  const vertical = portrait;
  const centers = [0, 1, 2, 3].map((i) => { const c = L.card(i); return vertical ? c.y + c.h / 2 : c.x + c.w / 2; });

  // packet position along the line
  const stops = [L.line.a, ...centers, L.line.b];
  const times = [6, ...N, N[3] + 40];
  const pos = interpolate(frame, times, stops, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const lit = N.filter((n) => frame >= n).length;
  const zoom = interpolate(frame, [cues.flow.wide, 320], [1, 0.97], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = progress(frame, 306, 320, Easing.in(Easing.cubic));

  const packet = { x: vertical ? L.line.at : pos, y: vertical ? pos : L.line.at };
  return (
    <AbsoluteFill style={{ background: C.white, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom}) translateY(${-exit * 60}px)`, opacity: 1 - exit }}>
        {L.title && (
          <div style={{ position: "absolute", left: L.title.x, top: L.title.y }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: "0.22em", color: C.muteLight, opacity: progress(frame, 0, 12) }}>HOW CATALYST WORKS</div>
            <RiseLines start={4} gap={6} lines={portrait ? ["Message to booking,", "in seconds."] : ["Message to booking, in seconds."]}
              style={{ marginTop: 10, fontFamily: DISPLAY, fontWeight: 800, fontSize: portrait ? 76 : 68, lineHeight: 1.05, letterSpacing: "-0.04em", color: C.ink }} />
          </div>
        )}

        {/* track */}
        <div style={{
          position: "absolute", background: "#E4E4E4", borderRadius: 4,
          ...(vertical ? { left: L.line.at - 4, top: L.line.a, width: 8, height: L.line.b - L.line.a } : { top: L.line.at - 4, left: L.line.a, height: 8, width: L.line.b - L.line.a }),
        }}>
          <div style={{ position: "absolute", background: C.ink, borderRadius: 4, ...(vertical ? { left: 0, right: 0, top: 0, height: Math.max(0, pos - L.line.a) } : { top: 0, bottom: 0, left: 0, width: Math.max(0, pos - L.line.a) }) }} />
        </div>
        {/* stations */}
        {centers.map((c, i) => {
          const on = frame >= N[i];
          const p = spring({ frame: frame - N[i], fps: 30, config: { damping: 10, stiffness: 180, mass: 0.6 } });
          const s = 56;
          return (
            <div key={i} style={{
              position: "absolute", width: s, height: s, borderRadius: s / 2, boxSizing: "border-box",
              left: (vertical ? L.line.at : c) - s / 2, top: (vertical ? c : L.line.at) - s / 2,
              background: on ? C.orange : C.white, border: `5px solid ${on ? C.ink : "#D0D0D0"}`, transform: `scale(${on ? 0.8 + 0.2 * p + 0.1 * Math.max(0, 1 - (frame - N[i]) / 10) : 1})`,
              display: "grid", placeItems: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, color: C.ink,
            }}>{on ? <Icon name="check" size={26} color={C.ink} stroke={3.4} /> : i + 1}</div>
          );
        })}
        {/* packet */}
        {frame >= 6 && frame < N[3] + 40 && (
          <div style={{ position: "absolute", left: packet.x - 18, top: packet.y - 18, width: 36, height: 36, borderRadius: 18, background: C.orange, boxShadow: "0 0 0 8px rgba(255,138,76,0.25), 0 0 40px 12px rgba(255,138,76,0.5)" }} />
        )}

        {/* cards */}
        {[0, 1, 2, 3].map((i) => {
          const c = L.card(i);
          return (
            <div key={i} style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h }}>
              <Station i={i} on={lit > i} u={L.u} compact={vertical} feed={feed} />
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Station({ i, on, u, compact, feed }: { i: number; on: boolean; u: number; compact: boolean; feed: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - N[i];
  const flip = spring({ frame: t, fps, config: { damping: 15, stiffness: 140 } });
  const fs = (compact ? 25 : 23) * u;
  const appear = progress(frame, 0, 12);

  const head = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 * u, letterSpacing: "0.16em", color: on ? C.orange : C.muteLight }}>
      <span>0{i + 1}</span><span style={{ color: on ? C.white : C.muteLight }}>{STEPS[i].toUpperCase()}</span>
      {i === 2 && on && (
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: C.orange, color: C.ink, borderRadius: 999, padding: "4px 12px", letterSpacing: "0.04em" }}>
          <Icon name="bolt" size={15 * u} fill={C.ink} stroke={0} /> 3s
        </span>
      )}
    </div>
  );

  let body: ReactNode = null;
  if (on && i === 0) {
    body = (
      <div style={{ display: "flex", flexDirection: compact ? "row" : "column", gap: 14, alignItems: compact ? "flex-start" : "stretch" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          <Avatar text="AP" size={48 * u} bg={C.orange} fg={C.ink} />
          {!compact && <div style={{ fontFamily: TEXT }}><div style={{ fontWeight: 700, fontSize: 19 * u, color: C.white }}>Amal Perera</div><div style={{ fontWeight: 500, fontSize: 15 * u, color: C.muteDark }}>New lead · WhatsApp</div></div>}
        </div>
        <div style={{ flex: 1, background: C.card2, color: C.white, borderRadius: 18, borderTopLeftRadius: 6, padding: "14px 18px", fontFamily: TEXT, fontWeight: 500, fontSize: fs, lineHeight: 1.4, minHeight: compact ? 0 : 0 }}>
          {typed(MSG, frame, N[0] + 4, N[0] + 30)}
        </div>
      </div>
    );
  }
  if (on && i === 1) {
    const chips = [
      { icon: "globe", k: "Language", v: "Singlish" },
      { icon: "calendar", k: "Wants", v: "A viewing" },
      { icon: "home", k: "Listing", v: "2BR · Rajagiriya" },
      { icon: "fire", k: "Lead", v: "Hot", hot: true },
    ];
    body = (
      <div style={{ display: "flex", flexDirection: compact ? "row" : "column", flexWrap: compact ? "wrap" : "nowrap", gap: compact ? 12 : 14 }}>
        {chips.map((c, k) => {
          const p = spring({ frame: t - 6 - k * 7, fps, config: { damping: 11, stiffness: 200, mass: 0.6 } });
          return (
            <div key={c.k} style={{
              display: "flex", alignItems: "center", gap: 12, borderRadius: 16, padding: compact ? "10px 16px" : "13px 16px",
              background: c.hot ? C.orange : C.card2, color: c.hot ? C.ink : C.white, fontFamily: TEXT, fontSize: fs * 0.92,
              opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * 30}px)`,
            }}>
              <Icon name={c.icon} size={fs} color={c.hot ? C.ink : C.orange} />
              <span style={{ opacity: 0.7, fontWeight: 500 }}>{c.k}</span><b style={{ fontWeight: 700 }}>{c.v}</b>
            </div>
          );
        })}
      </div>
    );
  }
  if (on && i === 2) {
    body = (
      <div style={{ background: C.orange, color: C.ink, borderRadius: 18, borderTopRightRadius: 6, padding: "14px 18px", fontFamily: TEXT, fontWeight: 600, fontSize: fs, lineHeight: 1.4, minHeight: compact ? 0 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: fs * 0.66, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 6 }}><Icon name="spark" size={fs * 0.7} fill={C.ink} stroke={0} />CATALYST AI · SINGLISH</div>
        {typed(REPLY, frame, N[2] + 4, N[2] + 34)}
      </div>
    );
  }
  if (on && i === 3) {
    const rows = [
      { icon: "calendar", a: "Viewing booked", b: "Sat 16 Nov · 10:30" },
      { icon: "receipt", a: "Deposit slip verified", b: "LKR 10,000" },
      { icon: "bell", a: "You got notified", b: "while you slept" },
    ];
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? (feed ? 8 : 10) : 14 }}>
        {rows.map((r, k) => {
          const p = spring({ frame: t - 4 - k * 9, fps, config: { damping: 12, stiffness: 190, mass: 0.6 } });
          return (
            <div key={r.a} style={{
              display: "flex", alignItems: "center", gap: 14, background: C.card2, borderRadius: 16, padding: compact ? "8px 14px" : "14px 16px",
              opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 20}px)`, fontFamily: TEXT,
            }}>
              <span style={{ width: 40 * u, height: 40 * u, borderRadius: 12, background: C.orange, display: "grid", placeItems: "center", flex: "none" }}><Icon name={r.icon} size={22 * u} color={C.ink} /></span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: compact ? "row" : "column", gap: compact ? 12 : 2, alignItems: compact ? "baseline" : "flex-start" }}>
                <span style={{ fontWeight: 700, fontSize: fs * 0.88, color: C.white }}>{r.a}</span>
                <span style={{ fontWeight: 500, fontSize: fs * 0.76, color: C.muteDark }}>{r.b}</span>
              </div>
              <Icon name="check" size={24 * u} color={C.orange} stroke={3.2} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", opacity: appear, perspective: 1400 }}>
      {/* placeholder */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 30, border: "3px dashed #D4D4D4", boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: 24 * u, color: "#B0B0B0", letterSpacing: "0.1em",
        opacity: on ? 1 - flip : 1,
      }}>0{i + 1} · {STEPS[i].toUpperCase()}</div>
      {on && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 30, background: C.ink, padding: compact ? "20px 26px" : "26px 24px", boxSizing: "border-box",
          display: "flex", flexDirection: "column", justifyContent: compact ? "center" : "flex-start", gap: compact ? 14 : 20, overflow: "hidden",
          transform: `rotate${compact ? "X" : "Y"}(${(1 - flip) * -70}deg)`, opacity: Math.min(1, flip * 1.6), transformOrigin: compact ? "50% 0%" : "0% 50%",
          boxShadow: "0 40px 80px -30px rgba(26,26,26,0.55)",
        }}>
          {head}
          {body}
        </div>
      )}
    </div>
  );
}
