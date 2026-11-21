import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CUE, f, FONT_UI, ORANGE, WA } from "../theme";
import { easeIn, easeInOut, easeOut, glide, lerp, mix, pop } from "../ui/anim";
import { ClockIcon } from "../ui/icons";
import { Avatar, Bubble, ChatHeader, TypingBubble, Wallpaper } from "../ui/WhatsApp";

/*
 * 6-9s  split screen: above the customer (right half) her chat with the owner's shop is stuck on "typing…".
 * 9-10.5s her chat closes and a new chat opens to "Another Shop", which answers at once.
 */
const SPLIT_RECT = { x: 568, y: 236, w: 478 };
const FULL_RECT = { x: 460, y: 1030, w: 560 };
const ASK = "Cinnamon thiyenawada? Kiyada?";

const ShopAvatar: React.FC<{ bg: string; label: string }> = ({ bg, label }) => (
  <Avatar name={label} size={50} bg={bg}>
    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>{label}</span>
  </Avatar>
);

const TypingSubtitle: React.FC<{ frame: number }> = ({ frame }) => {
  const dots = ".".repeat(1 + (Math.floor(frame / 6) % 3));
  return (
    <span style={{ color: WA.teal, fontWeight: 500 }}>
      typing<span style={{ display: "inline-block", width: 24, textAlign: "left" }}>{dots}</span>
    </span>
  );
};

export const SplitAndSwitch: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 182 || frame > 322) return null;

  // ---------- first card: the owner's shop, stuck on typing ----------
  const enter = pop(frame, 186, { damping: 15, stiffness: 170 });
  const move = glide(frame, 266, 13); // split rect -> full rect
  const closeAt = f(CUE.chatClose);
  const close = lerp(frame, [closeAt, closeAt + 8], [0, 1], easeIn);
  const rect = {
    x: mix(SPLIT_RECT.x, FULL_RECT.x, move),
    y: mix(SPLIT_RECT.y, FULL_RECT.y, move),
    w: mix(SPLIT_RECT.w, FULL_RECT.w, move),
  };

  // waiting clock: one tick every half second
  const tick0 = f(CUE.tickStart);
  const ticks = frame < tick0 ? 0 : Math.floor((frame - tick0) / 15) + 1;
  const minutes = Math.min(6, Math.max(1, ticks));
  const tickPulse = frame < tick0 ? 0 : Math.exp(-((frame - tick0) % 15) / 3);

  // ---------- second card: Another Shop ----------
  const openAt = f(CUE.chatOpen);
  const open = pop(frame, openAt, { damping: 16, stiffness: 190 });
  const sendAt = f(CUE.otherShopSend);
  const replyAt = f(CUE.otherShopReply);
  const whip = lerp(frame, [309, 317], [0, 1], easeIn);

  const cardStyle = (x: number, y: number, w: number): React.CSSProperties => ({
    position: "absolute",
    left: x,
    top: y,
    width: w,
    borderRadius: 34,
    overflow: "hidden",
    background: WA.wallpaper,
    boxShadow: "0 26px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
  });

  return (
    <AbsoluteFill>
      {frame < closeAt + 9 && (
        <div
          data-qa="overlay:stuck-chat"
          style={{
            ...cardStyle(rect.x, rect.y, rect.w),
            transform: `translateY(${(1 - enter) * -60}px) translateX(${-close * 140}px) scale(${(0.7 + 0.3 * enter) * (1 - 0.12 * close)})`,
            transformOrigin: "50% 100%",
            opacity: lerp(enter, [0, 0.3], [0, 1]) * (1 - close),
          }}
        >
          <ChatHeader compact name="Spice Corner" subtitle={<TypingSubtitle frame={frame} />} avatar={<ShopAvatar bg="#2F6E4F" label="SC" />} />
          <div style={{ position: "relative", padding: "10px 0 18px" }}>
            <Wallpaper />
            <div style={{ position: "relative" }}>
              <Bubble side="out" time="9:31 PM" read maxWidth={360}>
                {ASK}
              </Bubble>
              <TypingBubble frame={frame} />
            </div>
          </div>
        </div>
      )}

      {/* waiting clock chip under the stuck chat (split only) */}
      {frame >= tick0 && frame < 272 && (
        <div
          data-qa="overlay:wait-chip"
          style={{
            position: "absolute",
            left: SPLIT_RECT.x + SPLIT_RECT.w / 2,
            top: SPLIT_RECT.y + 372,
            transform: `translateX(-50%) scale(${pop(frame, tick0) * (1 + 0.06 * tickPulse)})`,
            opacity: lerp(frame, [262, 270], [1, 0]),
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 24px 12px 18px",
            borderRadius: 999,
            background: "rgba(26,26,26,0.88)",
            border: `2px solid ${ORANGE}`,
            color: "#fff",
            fontFamily: FONT_UI,
            fontWeight: 600,
            fontSize: 28,
            whiteSpace: "nowrap",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <ClockIcon size={34} color={ORANGE} minuteAngle={ticks * 60} hourAngle={300 + ticks * 5} />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            Waiting… {minutes} min
          </span>
        </div>
      )}

      {/* the new chat */}
      {frame >= openAt && (
        <div
          data-qa="overlay:other-shop-chat"
          style={{
            ...cardStyle(FULL_RECT.x, FULL_RECT.y, FULL_RECT.w),
            transform: `translateX(${(1 - Math.min(1, open)) * 56 - whip * 640}px) scale(${0.9 + 0.1 * Math.min(1, open)})`,
            transformOrigin: "100% 100%",
            opacity: lerp(open, [0, 0.35], [0, 1]) * (1 - lerp(frame, [313, 317], [0, 1])),
            filter: `blur(${whip * 14}px)`,
          }}
        >
          <ChatHeader compact name="Another Shop" subtitle="online" avatar={<ShopAvatar bg="#5A5F9E" label="AS" />} />
          <div style={{ position: "relative", padding: "10px 0 18px", minHeight: 210, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <Wallpaper />
            <div style={{ position: "relative" }}>
              {frame >= sendAt && (
                <Bubble side="out" time="9:37 PM" read appear={pop(frame, sendAt, { damping: 14, stiffness: 220 })} maxWidth={380}>
                  {ASK}
                </Bubble>
              )}
              {frame >= replyAt && (
                <Bubble side="in" time="9:37 PM" appear={pop(frame, replyAt, { damping: 14, stiffness: 220 })}>
                  Ow, thiyenawa! 😊
                </Bubble>
              )}
            </div>
          </div>
        </div>
      )}

      {/* left half: the owner's unread pile keeps growing */}
      {frame >= 188 && frame < 272 && (
        <div
          data-qa="overlay:left-badge"
          style={{
            position: "absolute",
            left: 150,
            top: 1010,
            minWidth: 64,
            height: 64,
            padding: "0 16px",
            borderRadius: 32,
            background: "#FF3B30",
            color: "#fff",
            fontFamily: FONT_UI,
            fontWeight: 700,
            fontSize: 34,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
            transform: `scale(${pop(frame, 188) * (1 + 0.08 * tickPulse)})`,
            opacity: lerp(frame, [262, 270], [1, 0]),
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {14 + Math.min(3, Math.floor(Math.max(0, frame - 200) / 22))}
        </div>
      )}
    </AbsoluteFill>
  );
};

export { easeInOut, easeOut };
