import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CUE, f, FONT_BRAND, FONT_UI, ORANGE, WA } from "../theme";
import { easeIn, lerp, pop } from "../ui/anim";
import { BoltIcon, GlobeIcon } from "../ui/icons";
import { emojify, Emoji } from "../ui/Emoji";
import { LogoMark } from "../ui/Logo";
import { PhoneFrame } from "../ui/PhoneFrame";
import { Avatar, Bubble, ChatHeader, InputBar, Wallpaper } from "../ui/WhatsApp";

/*
 * 14-20s: the owner's phone, Catalyst answering the customer for him.
 * The phone grows out of the real phone lying on the table (bottom-left of Shot 5).
 */
const PHONE = { x: 40, y: 590, w: 560, h: 1046 };
const TABLE_PHONE = { x: 240, y: 1590 }; // just above the real phone, inside the safe area

/** "*bold*" -> <b> (WhatsApp formatting) */
const WaText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*[^*]+\*)/g).map((p, i) =>
      p.startsWith("*") && p.endsWith("*") ? (
        <b key={i} style={{ fontWeight: 700 }}>
          {emojify(p.slice(1, -1))}
        </b>
      ) : (
        <React.Fragment key={i}>{emojify(p)}</React.Fragment>
      ),
    )}
  </>
);

const BotLabel: React.FC = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_UI, fontWeight: 600, fontSize: 18, color: "#D96A2B" }}>
    <LogoMark size={20} />
    Catalyst · auto-reply
  </span>
);

const MESSAGES: { side: "in" | "out"; text: string }[] = [
  { side: "in", text: "Cinnamon thiyenawada? Kiyada?" },
  { side: "out", text: "Ow, thiyenawa! 😊 100g pack Rs 1,250. Kiyak ona da?" },
  { side: "in", text: "3k denna" },
  {
    side: "out",
    text: "Niyamai! 🛒\n*Cinnamon 100g × 3 = Rs 3,750*\nOrder eka owner ta yawwa. Eyaa ikmanata contact karai 🙏",
  },
];

const Chip: React.FC<{ children: React.ReactNode; s: number; style?: React.CSSProperties }> = ({ children, s, style }) => (
  <div
    data-qa="overlay:chip"
    style={{
      position: "absolute",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 22px 12px 16px",
      borderRadius: 999,
      background: "rgba(26,26,26,0.9)",
      color: "#fff",
      fontFamily: FONT_BRAND,
      fontWeight: 700,
      fontSize: 28,
      whiteSpace: "nowrap",
      boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
      transform: `translateX(${(1 - s) * 40}px) scale(${0.7 + 0.3 * s})`,
      transformOrigin: "0% 50%",
      opacity: lerp(s, [0, 0.4], [0, 1]),
      ...style,
    }}
  >
    {children}
  </div>
);

export const CatalystChat: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 418 || frame > 600) return null;

  const enter = pop(frame, f(CUE.phoneIn), { damping: 15, stiffness: 120, mass: 0.9 });
  const exit = lerp(frame, [584, 597], [0, 1], easeIn);
  const msgAt = CUE.chatMsgs.map(f);
  const typing = CUE.chatTyping.map(([a, b]) => [f(a), f(b)] as const);
  const isReplying = typing.some(([a, b]) => frame >= a && frame < b);

  // grow from the table phone
  const dx = (TABLE_PHONE.x - (PHONE.x + PHONE.w / 2)) * (1 - enter);
  const dy = (TABLE_PHONE.y - (PHONE.y + PHONE.h / 2)) * (1 - enter);
  const sc = 0.18 + 0.82 * enter;

  const badge = pop(frame, f(CUE.badge), { damping: 13, stiffness: 180 });
  const fastChip = pop(frame, msgAt[1] + 4, { damping: 14, stiffness: 180 });
  const orderChip = pop(frame, msgAt[3] + 8, { damping: 14, stiffness: 180 });

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      {/* soft vignette so the phone reads against the footage */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0) 100%)",
          opacity: Math.min(1, enter),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: PHONE.x,
          top: PHONE.y,
          transform: `translate(${dx}px, ${dy + exit * 120}px) scale(${sc * (1 - 0.1 * exit)}) rotate(${(1 - enter) * -14}deg)`,
          transformOrigin: "50% 50%",
          opacity: lerp(enter, [0, 0.3], [0, 1]),
        }}
      >
        <div data-qa="overlay:phone" style={{ width: PHONE.w, height: PHONE.h, position: "absolute", left: 0, top: 0, pointerEvents: "none" }} />
        <PhoneFrame width={PHONE.w} height={PHONE.h} time="9:32">
          <ChatHeader name="Nimali" subtitle="online" avatar={<Avatar name="Nimali" size={50} />} />
          <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 12 }}>
            <Wallpaper />
            <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  alignSelf: "center",
                  margin: "0 30px 8px",
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: "#FFF1D6",
                  color: "#54656F",
                  fontFamily: FONT_UI,
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <LogoMark size={20} /> Catalyst auto-replies are on
              </div>
              {MESSAGES.map((m, i) =>
                frame >= msgAt[i] ? (
                  <Bubble
                    key={i}
                    side={m.side}
                    time="9:32 PM"
                    read
                    maxWidth={420}
                    fontSize={26}
                    appear={pop(frame, msgAt[i], { damping: 14, stiffness: 210 })}
                    label={m.side === "out" ? <BotLabel /> : undefined}
                  >
                    <WaText text={m.text} />
                  </Bubble>
                ) : null,
              )}
              {isReplying && (
                <div
                  style={{
                    alignSelf: "flex-end",
                    margin: "10px 18px 0",
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: "rgba(255,138,76,0.16)",
                    color: "#C85A1E",
                    fontFamily: FONT_UI,
                    fontWeight: 600,
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <LogoMark size={18} />
                  Catalyst is replying{".".repeat(1 + (Math.floor(frame / 5) % 3))}
                </div>
              )}
            </div>
          </div>
          <InputBar />
        </PhoneFrame>

        {/* language badge, pinned to the phone's lower edge */}
        <div
          data-qa="overlay:language-badge"
          style={{
            position: "absolute",
            left: PHONE.w / 2,
            top: PHONE.h - 30,
            transform: `translateX(-50%) scale(${badge})`,
            opacity: lerp(badge, [0, 0.3], [0, 1]),
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 26px 13px 20px",
            borderRadius: 999,
            background: ORANGE,
            color: "#fff",
            fontFamily: FONT_BRAND,
            fontWeight: 800,
            fontSize: 29,
            whiteSpace: "nowrap",
            boxShadow: "0 14px 34px rgba(255,138,76,0.45), 0 4px 12px rgba(0,0,0,0.3)",
            letterSpacing: "-0.01em",
          }}
        >
          <GlobeIcon size={32} />
          Sinhala · Tamil · English
        </div>
      </div>

      {frame >= msgAt[1] + 4 && (
        <Chip s={fastChip} style={{ left: 626, top: 1010 }}>
          <BoltIcon size={28} color={ORANGE} />
          Replied in 3s
        </Chip>
      )}
      {frame >= msgAt[3] + 8 && (
        <Chip s={orderChip} style={{ left: 626, top: 1390 }}>
          <Emoji char="📩" size="34px" />
          Order sent to owner
        </Chip>
      )}
    </AbsoluteFill>
  );
};

export { WA };
