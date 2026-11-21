import React from "react";
import { FONT_UI } from "../theme";
import { StatusIcons } from "./icons";

/** A modern phone (rounded bezel + dynamic island + status bar). Children fill the screen below the status bar. */
export const PhoneFrame: React.FC<{ width: number; height: number; time: string; children: React.ReactNode }> = ({
  width,
  height,
  time,
  children,
}) => {
  const bezel = 13;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 74,
        background: "linear-gradient(145deg, #3a3a3c 0%, #111 40%, #2b2b2d 100%)",
        padding: 4,
        boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 70, background: "#000", padding: bezel - 4 }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 60,
            overflow: "hidden",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* status bar */}
          <div
            style={{
              height: 62,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 34px 0 46px",
              background: "rgba(246,245,243,0.97)",
              fontFamily: FONT_UI,
              fontWeight: 600,
              fontSize: 23,
              color: "#000",
              position: "relative",
              zIndex: 3,
            }}
          >
            <span>{time}</span>
            <StatusIcons color="#000" scale={0.95} />
          </div>
          {/* dynamic island */}
          <div
            style={{
              position: "absolute",
              top: 14,
              left: "50%",
              width: 132,
              height: 38,
              marginLeft: -66,
              borderRadius: 20,
              background: "#000",
              zIndex: 4,
            }}
          />
          <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {children}
          </div>
          {/* home indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 9,
              left: "50%",
              width: 170,
              height: 6,
              marginLeft: -85,
              borderRadius: 3,
              background: "rgba(0,0,0,0.85)",
              zIndex: 5,
            }}
          />
        </div>
      </div>
    </div>
  );
};
