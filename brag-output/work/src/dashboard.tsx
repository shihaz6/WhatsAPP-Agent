// The dashboard's own screens, mirrored from web/src/views/* with the same markup and class names, so the real
// stylesheet (web/src/styles.css) styles them. Every name, number and message here is a fictional stand-in.

import type { CSSProperties, ReactNode } from "react";
import { Glyph } from "../../../web/src/Glyph";
import { LANGUAGE_INFO } from "../../../web/src/format";
import type { Language } from "../../../web/src/types";
import { C, pop, progress } from "./kit";

// Grows an element's height from 0 so a bottom-anchored list slides up instead of jumping.
export function Appear({ p, max = 220, from = "left", children, style }: { p: number; max?: number; from?: "left" | "right" | "up"; children: ReactNode; style?: CSSProperties }) {
  if (p <= 0) return null;
  const origin = from === "right" ? "right bottom" : from === "up" ? "center top" : "left bottom";
  return (
    <div style={{ maxHeight: Math.min(1, p) * max, overflow: "visible", flex: "none", display: "flex", flexDirection: "column", ...style }}>
      <div style={{ display: "flex", flexDirection: "column", transform: `scale(${0.85 + 0.15 * p})`, transformOrigin: origin, opacity: Math.min(1, p * 1.6) }}>{children}</div>
    </div>
  );
}

export function Avatar({ initials, size = 38 }: { initials: string; size?: number }) {
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>;
}

export function LangChip({ language }: { language: Language }) {
  return <span className={`lang lang-${language}`}>{LANGUAGE_INFO[language].label}</span>;
}

function Dots({ f }: { f: number }) {
  return (
    <div style={{ display: "flex", gap: 5, padding: "6px 2px 4px" }}>
      {[0, 1, 2].map((i) => {
        const s = Math.sin((f - i * 4) / 3.2);
        return <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: "var(--teal-text)", opacity: 0.45 + 0.45 * Math.max(0, s), transform: `translateY(${s * -2.5}px)` }} />;
      })}
    </div>
  );
}

// ---------- Conversations: one thread ----------
export function ThreadScreen({ f, incomingAt, dotsAt, replyAt, toolAt, paused = false, pauseP = 0, takeOverAnchor }: {
  f: number; incomingAt: number; dotsAt: number; replyAt: number; toolAt: number; paused?: boolean; pauseP?: number; takeOverAnchor?: ReactNode;
}) {
  const inP = pop(f, incomingAt, 14);
  const dotsP = f >= replyAt ? 0 : pop(f, dotsAt, 10);
  const replyP = pop(f, replyAt, 14);
  const toolP = pop(f, toolAt, 12);
  return (
    <div className="chat-thread panel" style={{ width: 680, height: 540, boxShadow: "0 40px 90px -30px rgba(0,0,0,0.6)" }}>
      <div className="thread">
        <header className="thread-head">
          <Avatar initials="DS" size={40} />
          <div className="grow min0">
            <div className="thread-name ellipsis">Mrs. D. Silva</div>
            <div className="row-sub">+94 77 000 0218 · parent</div>
          </div>
          <div className="thread-actions">
            <span style={{ height: 32, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 13 }}>
              Auto · Singlish <span className="muted">▾</span>
            </span>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <button className={`btn btn-sm ${paused ? "btn-ai" : "btn-info"}`}>
                <Glyph name="bot" size={15} />
                {paused ? "Hand back to bot" : "Take over"}
              </button>
              {takeOverAnchor}
            </span>
          </div>
        </header>

        {paused && (
          <div style={{ maxHeight: pauseP * 60, overflow: "hidden", opacity: pauseP }}>
            <div className="banner banner-blue">
              <strong>Bot paused.</strong> You're replying to this chat; the bot stays quiet until you hand it back.
            </div>
          </div>
        )}

        <div className="thread-body">
          <div className="messages" style={{ overflow: "hidden", justifyContent: "flex-end" }}>
            <div className="msg-wrap"><div className="day-divider"><span>Today</span></div></div>
            <Appear p={inP}>
              <div className="msg-wrap">
                <div className="msg msg-in">
                  <div className="msg-body">Sir, Saturday maths class eka keeyatada?</div>
                  <div className="msg-meta num">23:42</div>
                </div>
              </div>
            </Appear>
            <Appear p={dotsP} from="right" max={60}>
              <div className="msg-wrap"><div className="msg msg-out"><Dots f={f} /></div></div>
            </Appear>
            <Appear p={replyP} from="right">
              <div className="msg-wrap">
                <div className="msg msg-out">
                  <div className="msg-body">Saturday <strong>8.00 AM</strong> ta, Hall A eke. Free trial class ekak book karanna kamathi da?</div>
                  <div className="msg-meta num"><span className="msg-who msg-who-bot">AI</span>23:42<span className="msg-tick">✓</span></div>
                </div>
                {toolP > 0 && (
                  <div className="msg-notes msg-notes-out" style={{ opacity: Math.min(1, toolP * 1.5), transform: `translateY(${(1 - toolP) * 6}px)` }}>
                    <div className="msg-note"><Glyph name="bot" size={12} /> Looked up the schedule</div>
                  </div>
                )}
              </div>
            </Appear>
          </div>
        </div>

        {paused ? (
          <form className="composer">
            <div className="composer-row">
              <textarea rows={2} readOnly placeholder="Reply as the teacher… (Enter to send, Shift+Enter for a new line)" />
              <button type="button" className="btn btn-primary" disabled>Send</button>
            </div>
          </form>
        ) : (
          <div className="composer composer-locked">
            <span className="muted"><Glyph name="bot" size={15} /> The bot is answering this chat.</span>
            <button className="btn btn-sm btn-info">Take over to reply</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Conversations: the list ----------
const CHATS: { initials: string; name: string; text: string; language: Language }[] = [
  { initials: "NP", name: "Mrs. N. Perera", text: "සෙනසුරාදා පන්තිය කීයටද?", language: "si" },
  { initials: "AR", name: "Mr. A. Rahman", text: "வகுப்பு எத்தனை மணிக்கு?", language: "ta" },
  { initials: "KS", name: "Kasun S.", text: "Sir, fees kiyada masekata?", language: "singlish" },
  { initials: "PK", name: "Priya K.", text: "Physics class eppo start aagum?", language: "tanglish" },
  { initials: "JF", name: "Mr. J. Fonseka", text: "Is there a free trial class?", language: "en" },
];

export function ListScreen({ f, first, every }: { f: number; first: number; every: number }) {
  return (
    <section className="chat-list panel" style={{ width: 420, boxShadow: "0 40px 90px -30px rgba(0,0,0,0.6)" }}>
      <div className="chat-list-head">
        <h1 className="h-compact">Conversations</h1>
        <input className="search" readOnly placeholder="Search name, number or message" />
        <div className="filters">
          {["All", "Paused", "English", "Sinhala", "Tamil", "Singlish", "Tanglish"].map((x) => (
            <button key={x} className={`filter ${x === "All" ? "on" : ""}`}>{x}</button>
          ))}
        </div>
      </div>
      <ul className="chat-items" style={{ overflow: "hidden", minHeight: 5 * 64 }}>
        {CHATS.map((c, i) => {
          const p = pop(f, first + i * every, 12);
          return (
            <li key={c.name} style={{ maxHeight: Math.min(1, p) * 70, opacity: Math.min(1, p * 1.6), transform: `translateX(${(1 - Math.min(1, p)) * 30}px)` }}>
              <a className="chat-item">
                <Avatar initials={c.initials} />
                <div className="grow min0">
                  <div className="chat-item-top">
                    <span className="row-title ellipsis">{c.name}</span>
                    <span className="muted small nowrap">now</span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="row-sub ellipsis">{c.text}</span>
                    <LangChip language={c.language} />
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- Payments ----------
function SlipPhoto() {
  return (
    <div className="media-thumb media-sm" style={{ background: "#fff", padding: 7, display: "flex", flexDirection: "column", gap: 4, cursor: "default" }}>
      <div style={{ height: 6, width: "70%", background: "#1d4ed8", borderRadius: 2 }} />
      <div style={{ height: 3, width: "90%", background: "#d1d5db", borderRadius: 2 }} />
      <div style={{ height: 3, width: "60%", background: "#d1d5db", borderRadius: 2 }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: "#111827", marginTop: 2 }}>LKR 3,500</div>
      <div style={{ height: 3, width: "80%", background: "#d1d5db", borderRadius: 2 }} />
    </div>
  );
}

export function PaymentsScreen({ f, done, approveAnchor }: { f: number; done: number; approveAnchor?: ReactNode }) {
  const d = progress(f, done, done + 10);
  const approved = f >= done;
  return (
    <div className="stack" style={{ width: 660 }}>
      <section className="stats stats-2">
        <div className="stat"><div className="stat-label"><span className="stat-dot tone-amber" />Slips to review</div><div className="stat-value">{approved ? 1 : 2}</div><div className="stat-note">{approved ? "LKR 2,000" : "LKR 5,500"}</div></div>
        <div className="stat"><div className="stat-label"><span className="stat-dot" />Outstanding</div><div className="stat-value">{approved ? "LKR 21,000" : "LKR 24,500"}</div><div className="stat-note">6 families</div></div>
      </section>
      <section className="panel" style={{ boxShadow: "0 40px 90px -30px rgba(0,0,0,0.6)" }}>
        <div className="panel-head"><h2>Slips waiting for review</h2></div>
        <ul className="slips">
          <li className="slip">
            <div className="slip-main">
              <SlipPhoto />
              <div className="grow min0">
                <div className="row-title">Nethmi Jayasuriya <span className="muted">·</span> <span className="num">LKR 3,500</span></div>
                <div className="row-sub">2027 A/L Combined Maths – Theory · 2026-11 · “TRX 48213”</div>
                <div className="row-sub">Received just now</div>
              </div>
              {!approved ? (
                <div className="slip-actions">
                  <button className="btn btn-sm btn-ghost">Reject</button>
                  <span style={{ position: "relative", display: "inline-flex" }}>
                    <button className="btn btn-sm btn-primary">Approve</button>
                    {approveAnchor}
                  </span>
                </div>
              ) : (
                <div className="slip-actions" style={{ position: "relative" }}>
                  <span className="badge badge-green" style={{ height: 30, padding: "0 12px", fontSize: 13, transform: `scale(${0.6 + 0.4 * d})`, opacity: d }}>✓ Approved</span>
                  {approveAnchor}
                </div>
              )}
            </div>
          </li>
          <li className="slip">
            <div className="slip-main">
              <div className="media-thumb media-sm" style={{ cursor: "default" }}><span className="media-pdf">PDF<small>Open</small></span></div>
              <div className="grow min0">
                <div className="row-title">Ashen Gunasekara <span className="muted">·</span> <span className="num">LKR 2,000</span></div>
                <div className="row-sub">Grade 11 Maths – Theory · 2026-11</div>
                <div className="row-sub">Received 2h ago</div>
              </div>
              <div className="slip-actions">
                <button className="btn btn-sm btn-ghost">Reject</button>
                <button className="btn btn-sm btn-primary">Approve</button>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}

export const shadowGlow = `0 0 0 1px ${C.line}`;
