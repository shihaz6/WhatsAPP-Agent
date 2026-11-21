import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { CHARCOAL, FONT_BRAND, ORANGE } from "./theme";
import { WaAppIcon } from "./ui/icons";
import { Emoji } from "./ui/Emoji";
import { Logo } from "./ui/Logo";
import { Avatar, IosBanner } from "./ui/WhatsApp";

/**
 * 1080x1920 cover. The headline sits inside the centre 1080x1350 band (y 285-1635) so it
 * survives the 4:5 profile-grid crop as well as the full 9:16 view.
 */
const BANNERS = [
  { name: "Kasun", msg: "Kiyada?", y: 1135, x: 470, r: 3 },
  { name: "Fathima", msg: "Available?", y: 1290, x: 440, r: -2 },
  { name: "Ravi", msg: "Price pls", y: 1445, x: 465, r: 2 },
];

export const Cover: React.FC = () => (
  <AbsoluteFill style={{ background: CHARCOAL }}>
    <Img
      src={staticFile("cover-bg.png")}
      style={{ position: "absolute", left: 0, top: 230, width: 1080, height: 1920, objectFit: "cover" }}
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #1A1A1A 0%, #1A1A1A 13%, rgba(26,26,26,0.82) 22%, rgba(26,26,26,0.15) 40%, rgba(26,26,26,0) 55%, rgba(26,26,26,0.55) 82%, #1A1A1A 100%)",
      }}
    />
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      {["Your dinner is", "costing you", "*customers* 😳"].map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: FONT_BRAND,
            fontWeight: 900,
            fontSize: 112,
            lineHeight: 1.04,
            letterSpacing: "-0.04em",
            color: "#fff",
            textShadow: "0 6px 30px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          {line.startsWith("*") ? (
            <>
              <span style={{ color: ORANGE }}>customers</span> <Emoji char="😳" size="0.95em" />
            </>
          ) : (
            line
          )}
        </div>
      ))}
    </AbsoluteFill>
    {BANNERS.map((b) => (
      <div key={b.name} style={{ position: "absolute", left: b.x, top: b.y, transform: `rotate(${b.r}deg)` }}>
        <IosBanner
          width={560}
          scale={0.9}
          icon={
            <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
              <Avatar name={b.name} size={68} />
              <div style={{ position: "absolute", right: -5, bottom: -5, padding: 2, borderRadius: 9, background: "#f6f6f8" }}>
                <WaAppIcon size={26} />
              </div>
            </div>
          }
          title={b.name}
          body={b.msg}
          time="now"
        />
      </div>
    ))}
    <div style={{ position: "absolute", left: 0, right: 0, top: 1600, display: "flex", justifyContent: "center" }}>
      <div style={{ padding: "16px 30px", borderRadius: 999, background: "rgba(26,26,26,0.85)", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
        <Logo size={56} />
      </div>
    </div>
  </AbsoluteFill>
);
