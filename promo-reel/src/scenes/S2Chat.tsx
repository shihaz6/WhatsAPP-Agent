import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CUE, f, FONT_UI, WA } from "../theme";
import { easeIn, easeInOut, lerp, pop } from "../ui/anim";
import { WaAppIcon } from "../ui/icons";
import { Avatar, Bubble, ChatHeader, InputBar, Wallpaper } from "../ui/WhatsApp";

// Card sits to the right of the owner's phone (his phone: x 130-430, y 1070-1440).
const CARD = { x: 500, y: 990, w: 540, h: 660 };
const REPLY = "100g Rs 1,250 😊";
const ARRIVALS = [
  { name: "Fathima", msg: "Available?" },
  { name: "Ravi", msg: "Price pls" },
  { name: "Tharushi", msg: "Location?" },
];

export const S2Chat: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 90 || frame > 190) return null;

  const enter = pop(frame, 92, { damping: 15, stiffness: 170 });
  const exit = lerp(frame, [170, 180], [0, 1], easeIn);

  // typing the reply
  const [ty0, ty1] = CUE.s2Typing.map(f);
  const send = f(CUE.s2Send);
  const chars = Array.from(REPLY);
  const typed = frame >= send ? "" : chars.slice(0, Math.round(lerp(frame, [ty0, ty1], [0, chars.length]))).join("");
  const sent = pop(frame, send, { damping: 14, stiffness: 220 });

  // unread counter 6 -> 11 -> 14
  const counts = CUE.s2Count.map(([s, n]) => [f(s), n] as const);
  const current = [...counts].reverse().find(([at]) => frame >= at) ?? counts[0];
  const bump = Math.exp(-Math.max(0, frame - current[0]) / 4) * (current[0] > 90 ? 1 : 0);

  const arrivalFrames = CUE.s2Arrivals.map(f);

  return (
    <AbsoluteFill>
      <div
        data-qa="overlay:reply-card"
        style={{
          position: "absolute",
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 40,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
          transform: `translate(${(1 - enter) * -240 + exit * 120}px, ${(1 - enter) * 160}px) scale(${(0.45 + 0.55 * enter) * (1 - 0.15 * exit)}) rotate(${(1 - enter) * -6}deg)`,
          transformOrigin: "0% 60%",
          opacity: lerp(enter, [0, 0.3], [0, 1]) * (1 - exit),
          display: "flex",
          flexDirection: "column",
          background: WA.wallpaper,
        }}
      >
        <ChatHeader
          name="Kasun"
          subtitle="online"
          unread={current[1]}
          unreadBump={bump}
          avatar={<Avatar name="Kasun" size={52} />}
        />
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 14 }}>
          <Wallpaper />
          <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
            <div style={{ alignSelf: "center", margin: "0 0 6px", padding: "5px 14px", borderRadius: 10, background: "rgba(255,255,255,0.92)", fontFamily: FONT_UI, fontSize: 17, color: WA.meta, fontWeight: 500 }}>
              Today
            </div>
            <Bubble side="in" time="9:29 PM">
              Hi ayye 👋
            </Bubble>
            <Bubble side="in" time="9:30 PM" tail={false}>
              Kiyada?
            </Bubble>
            {frame >= send && (
              <Bubble side="out" time="9:30 PM" read={false} appear={sent}>
                {REPLY}
              </Bubble>
            )}
          </div>
        </div>
        <InputBar text={typed} caret={frame >= ty0 - 4 && frame < send} sendScale={typed.length ? 1 : 0} />

        {/* in-app banners for the messages that keep arriving (clipped below the header) */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 84, height: 130, overflow: "hidden", zIndex: 5 }}>
        {ARRIVALS.map((m, i) => {
          const a = arrivalFrames[i];
          const next = arrivalFrames[i + 1] ?? 999;
          if (frame < a || frame > next + 8) return null;
          const s = pop(frame, a, { damping: 15, stiffness: 230 });
          const out = lerp(frame, [next, next + 6], [0, 1], easeInOut);
          return (
            <div
              key={m.name}
              style={{
                position: "absolute",
                left: 14,
                right: 14,
                top: 10,
                transform: `translateY(${(1 - s) * -130 - out * 130}px)`,
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 26,
                background: "rgba(250,250,252,0.97)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                fontFamily: FONT_UI,
                zIndex: 5,
              }}
            >
              <div style={{ position: "relative" }}>
                <Avatar name={m.name} size={50} />
                <div style={{ position: "absolute", right: -5, bottom: -5, padding: 2, borderRadius: 7, background: "#fff" }}>
                  <WaAppIcon size={22} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 22, color: "#000" }}>{m.name}</div>
                <div style={{ fontSize: 22, color: "#000" }}>{m.msg}</div>
              </div>
              <div style={{ fontSize: 17, color: "rgba(60,60,67,0.6)", alignSelf: "flex-start" }}>now</div>
            </div>
          );
        })}
        </div>
      </div>

      {/* big unread badge on the card corner, mirrors the header counter */}
      <div
        data-qa="overlay:unread-badge"
        style={{
          position: "absolute",
          left: CARD.x - 26,
          top: CARD.y - 30,
          minWidth: 76,
          height: 76,
          padding: "0 20px",
          borderRadius: 38,
          background: "#FF3B30",
          border: "4px solid #fff",
          color: "#fff",
          fontFamily: FONT_UI,
          fontWeight: 700,
          fontSize: 40,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
          transform: `scale(${enter * (1 - exit) * (1 + 0.3 * bump)})`,
          fontVariantNumeric: "tabular-nums",
          zIndex: 6,
        }}
      >
        {current[1]}
      </div>
    </AbsoluteFill>
  );
};
