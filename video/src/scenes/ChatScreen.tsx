// The Conversations screen, driven entirely by props so scenes can animate it.
import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { AppShell, Icon } from "../kit";
import { APP_H } from "../timeline";

export type Bubble = { id: string; dir: "in" | "out"; text: ReactNode; time: string; style?: CSSProperties; by?: string };

const BOT = <Icon size={14} d={<><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 4.5V8M9.5 13h.01M14.5 13h.01" /></>} />;

const OTHERS = [
  { name: "Mr. R. Fernando", initials: "F", last: "ok thanks!", ago: "4m", lang: "en", label: "English" },
  { name: "Mohamed Rizwan", initials: "MR", last: "Aama, A/L Physics – Paper Class Thursday 18:30…", ago: "41m", lang: "tanglish", label: "Tanglish" },
  { name: "Mrs. S. Perera", initials: "P", last: "hari sthuthi", ago: "1h", lang: "singlish", label: "Singlish" },
  { name: "Mrs. K. Rajapaksha", initials: "R", last: "Grade 10 Maths – Theory: මාසිකව LKR 2,000", ago: "5h", lang: "si", label: "Sinhala" },
  { name: "Ms. A. Herath", initials: "H", last: "Can I book a trial class?", ago: "6h", lang: "en", label: "English" },
  { name: "Shenali de Silva", initials: "SD", last: "Thank you!", ago: "1d", lang: "en", label: "English" },
  { name: "Mr. L. Gunawardena", initials: "G", last: "What are the fees for O/L?", ago: "2d", lang: "en", label: "English" },
];

export function ChatScreen({
  newItem, selected, bubbles, typing = 0, language, langPulse = 0, paused = false, pausedP = 1,
  draft, composerFocus = false, listStyle,
}: {
  newItem: { p: number; last: string; ago: string; unread: boolean; lang: string; label: string };
  selected: boolean;
  bubbles: Bubble[];
  typing?: number;              // 0..1 opacity of the typing indicator
  language: string;             // label in the language picker
  langPulse?: number;           // 0..1 highlight on the language picker
  paused?: boolean;
  pausedP?: number;             // 0..1 banner reveal
  draft?: string;
  composerFocus?: boolean;
  listStyle?: CSSProperties;
}) {
  const itemHeight = 63 * newItem.p; // the new chat pushes the list down
  return (
    <AppShell tab="conversations">
      <div className="chat-layout" style={{ height: APP_H - 56 }}>
        <section className="chat-list panel" style={listStyle}>
          <div className="chat-list-head">
            <h1 className="h-compact">Conversations</h1>
            <input className="search" placeholder="Search name, number or message" readOnly />
            <div className="filters">
              {["All", "Paused", "English", "Sinhala", "Tamil", "Singlish", "Tanglish"].map((f) => (
                <button key={f} className={`filter ${f === "All" ? "on" : ""}`}>{f}</button>
              ))}
            </div>
          </div>
          <ul className="chat-items" style={{ overflow: "hidden" }}>
            <li style={{ height: itemHeight, opacity: newItem.p, transform: `translateY(${(1 - newItem.p) * -18}px)`, overflow: "hidden" }}>
              <div className={`chat-item ${selected ? "active" : ""}`}>
                <span className="avatar" style={{ width: 38, height: 38, fontSize: 13.7 }}>NS</span>
                <div className="grow min0">
                  <div className="chat-item-top">
                    <span className="row-title ellipsis">Mrs. N. Silva</span>
                    <span className="muted small nowrap">{newItem.ago}</span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="row-sub ellipsis" style={newItem.unread ? { color: "var(--text)", fontWeight: 600 } : undefined}>{newItem.last}</span>
                    {newItem.unread ? <span className="unread" /> : paused
                      ? <span className="badge badge-amber">Paused</span>
                      : <span className={`lang lang-${newItem.lang}`}>{newItem.label}</span>}
                  </div>
                </div>
              </div>
            </li>
            {OTHERS.map((c) => (
              <li key={c.name}>
                <div className="chat-item">
                  <span className="avatar" style={{ width: 38, height: 38, fontSize: 13.7 }}>{c.initials}</span>
                  <div className="grow min0">
                    <div className="chat-item-top"><span className="row-title ellipsis">{c.name}</span><span className="muted small nowrap">{c.ago}</span></div>
                    <div className="chat-item-bottom"><span className="row-sub ellipsis">{c.last}</span><span className={`lang lang-${c.lang}`}>{c.label}</span></div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="chat-thread panel">
          {!selected ? (
            <div className="empty" style={{ margin: "auto" }}>
              <div className="empty-glyph"><Icon size={32} d={<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17H10l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z" />} /></div>
              <div className="empty-title">Pick a conversation</div>
              <div className="empty-body">Chats update every few seconds.</div>
            </div>
          ) : (
            <div className="thread">
              <header className="thread-head">
                <span className="avatar" style={{ width: 40, height: 40, fontSize: 14.4 }}>NS</span>
                <div className="grow min0">
                  <div className="thread-name">Mrs. N. Silva</div>
                  <div className="row-sub">+94 77 123 4567 · parent</div>
                </div>
                <div className="thread-actions">
                  <label className="lang-select">
                    <select value={language} onChange={() => {}} style={{
                      boxShadow: langPulse ? `0 0 0 ${3 + langPulse * 2}px rgba(34,160,107,${0.35 * langPulse})` : undefined,
                      borderColor: langPulse > 0.05 ? "var(--accent)" : undefined,
                    }}>
                      <option>{language}</option>
                    </select>
                  </label>
                  {paused
                    ? <button className="btn btn-sm btn-soft">{BOT} Hand back to bot</button>
                    : <button className="btn btn-sm btn-warn">{BOT} Take over</button>}
                  <button className="btn btn-ghost btn-sm">Details</button>
                </div>
              </header>
              {paused && (
                <div style={{ height: 38 * pausedP, overflow: "hidden", opacity: pausedP }}>
                  <div className="banner banner-amber"><strong>Bot paused.</strong> You're replying to this chat; the bot stays quiet until you hand it back.</div>
                </div>
              )}
              <div className="thread-body">
                <div className="messages" style={{ justifyContent: "flex-end" }}>
                  <div className="day-divider"><span>Wed 11 Nov</span></div>
                  {bubbles.map((b) => (
                    <div key={b.id} className="msg-wrap" style={b.style}>
                      {b.by && <div className="bot-note" style={{ alignSelf: "flex-end" }}>{b.by}</div>}
                      <div className={`msg msg-${b.dir}`}>
                        <div className="msg-body">{b.text}</div>
                        <div className="msg-meta num">{b.time}</div>
                      </div>
                    </div>
                  ))}
                  {typing > 0 && (
                    <div className="msg-wrap" style={{ opacity: typing }}>
                      <div className="bot-note">{BOT} Catalyst is replying…</div>
                      <TypingDots />
                    </div>
                  )}
                </div>
              </div>
              {paused ? (
                <div className="composer">
                  <div className="composer-row">
                    <textarea rows={2} readOnly value={draft ?? ""} placeholder="Reply as the teacher… (Enter to send)"
                      style={composerFocus ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-ring)" } : undefined} />
                    <button className="btn btn-primary" style={{ opacity: draft ? 1 : 0.5 }}>Send</button>
                  </div>
                </div>
              ) : (
                <div className="composer composer-locked">
                  <span className="muted">{BOT} The bot is answering this chat.</span>
                  <button className="btn btn-sm btn-warn">Take over to reply</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function TypingDots() {
  const frame = useCurrentFrame();
  return (
    <div className="typing">
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ transform: `translateY(${-3 * Math.max(0, Math.sin((frame - i * 4) / 4))}px)`, opacity: 0.5 + 0.5 * Math.max(0, Math.sin((frame - i * 4) / 4)) }} />
      ))}
    </div>
  );
}
