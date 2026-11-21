import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CUE, f, FONT_UI } from "../theme";
import { easeIn, lerp, pop } from "../ui/anim";
import { WaAppIcon } from "../ui/icons";
import { Avatar, IosBanner } from "../ui/WhatsApp";

// The glowing phone in Shot 1 sits bottom-left (about x 0-400, y 1230-1460).
const PHONE = { x: 200, y: 1345 };
const STACK_LEFT = 70;
const STACK_BOTTOM = 1195;
const SLOT = 146;
const WIDTH = 860;
const BANNER_H = 128;

const MESSAGES = [
  { name: "Kasun", msg: "Kiyada?" },
  { name: "Fathima", msg: "Available?" },
  { name: "Ravi", msg: "Price pls" },
  { name: "Tharushi", msg: "Location?" },
];

const ContactIcon: React.FC<{ name: string }> = ({ name }) => (
  <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0 }}>
    <Avatar name={name} size={76} />
    <div style={{ position: "absolute", right: -6, bottom: -6, borderRadius: 10, padding: 2.5, background: "rgba(246,246,248,1)" }}>
      <WaAppIcon size={30} />
    </div>
  </div>
);

export const S1Notifications: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame > 96) return null;
  const arrivals = CUE.notifications.map(f);

  // phone glow pulses on each buzz
  const glow = arrivals.reduce((acc, a) => {
    const d = frame - a;
    return d >= -1 ? acc + Math.exp(-Math.max(0, d) / 7) : acc;
  }, 0);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: PHONE.x - 360,
          top: PHONE.y - 300,
          width: 720,
          height: 600,
          background: "radial-gradient(closest-side, rgba(200,225,255,0.55), rgba(200,225,255,0) 70%)",
          opacity: Math.min(1, glow) * lerp(frame, [84, 90], [1, 0]),
          mixBlendMode: "screen",
        }}
      />
      {MESSAGES.map((m, i) => {
        const a = arrivals[i];
        if (frame < a) return null;
        const s = pop(frame, a, { damping: 13, stiffness: 210, mass: 0.6 });
        // newer banners push this one up
        const lift = arrivals.slice(i + 1).reduce((acc, b) => acc + pop(frame, b, { damping: 18, stiffness: 200 }) * SLOT, 0);
        const finalX = STACK_LEFT;
        const finalY = STACK_BOTTOM - BANNER_H - lift;
        const x = PHONE.x - WIDTH * 0.2 + (finalX - (PHONE.x - WIDTH * 0.2)) * Math.min(1, s);
        const y = PHONE.y - 60 + (finalY - (PHONE.y - 60)) * s;
        const exit = lerp(frame, [83, 90], [0, 1], easeIn);
        return (
          <div
            key={m.name}
            data-qa="overlay:notification"
            style={{
              position: "absolute",
              left: x,
              top: y - exit * (120 + (3 - i) * 50),
              transform: `scale(${(0.35 + 0.65 * s) * (1 + 0.18 * exit)})`,
              transformOrigin: "20% 100%",
              opacity: lerp(s, [0, 0.35], [0, 1]) * (1 - exit),
              filter: exit > 0 ? `blur(${exit * 8}px)` : undefined,
            }}
          >
            <IosBanner width={WIDTH} scale={1.08} icon={<ContactIcon name={m.name} />} title={m.name} body={m.msg} time="now" />
          </div>
        );
      })}
      {/* unread pill on the glowing phone */}
      {frame >= arrivals[0] && (
        <div
          data-qa="overlay:phone-badge"
          style={{
            position: "absolute",
            left: 352,
            top: 1222,
            minWidth: 50,
            height: 50,
            padding: "0 13px",
            borderRadius: 25,
            background: "#FF3B30",
            color: "#fff",
            fontFamily: FONT_UI,
            fontWeight: 700,
            fontSize: 30,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
            transform: `scale(${pop(frame, arrivals[0]) * (1 + 0.25 * Math.exp(-Math.max(0, frame - arrivals[arrivals.findLastIndex((a) => a <= frame)]) / 4))})`,
            opacity: lerp(frame, [84, 90], [1, 0]),
          }}
        >
          {arrivals.filter((a) => a <= frame).length}
        </div>
      )}
    </AbsoluteFill>
  );
};
