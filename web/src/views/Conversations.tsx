import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { Glyph } from "../Glyph";
import { LANGUAGE_INFO, ago, clock, dayLabel, displayName, messageText, money } from "../format";
import { go, href } from "../nav";
import { LANGUAGES, type ConversationDetail, type ConversationSummary, type Language, type Message } from "../types";
import { Avatar, Empty, ErrorNote, LangChip, Skeleton, useData } from "../ui";

type Filter = "all" | "paused" | Language;

export function Conversations({ onAuthError, selected }: { onAuthError: () => void; selected?: string }) {
  const list = useData(api.conversations, [], { pollMs: 5000, onAuthError });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list.data ?? []).filter((c) =>
      (filter === "all" || (filter === "paused" ? c.bot_paused : c.language === filter)) &&
      (!q || c.wa_id.includes(q) || (c.name ?? "").toLowerCase().includes(q) || (c.last_body ?? "").toLowerCase().includes(q)));
  }, [list.data, query, filter]);

  return (
    <div className={`chat-layout ${selected ? "has-selection" : ""}`}>
      <section className="chat-list panel" aria-label="Conversations">
        <div className="chat-list-head">
          <h1 className="h-compact">Conversations</h1>
          <input className="search" type="search" placeholder="Search name, number or message" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Search conversations" />
          <div className="filters" role="tablist" aria-label="Filter">
            {(["all", "paused", ...LANGUAGES] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={`filter ${filter === f ? "on" : ""}`}
                onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "paused" ? "Paused" : LANGUAGE_INFO[f].label}
              </button>
            ))}
          </div>
        </div>
        {list.error && !list.data && <ErrorNote error={list.error} onRetry={() => list.refresh()} />}
        {!list.data && !list.error && <Skeleton rows={6} />}
        {list.data && shown.length === 0 && <Empty title="No conversations match" />}
        <ul className="chat-items">
          {shown.map((c) => <ChatItem key={c.id} c={c} active={c.wa_id === selected} />)}
        </ul>
      </section>

      <section className="chat-thread panel" aria-label="Chat">
        {selected
          ? <Thread key={selected} waId={selected} onAuthError={onAuthError} onChanged={() => list.refresh(true)} />
          : <Empty glyph={<Glyph name="chat" size={32} />} title="Pick a conversation">
              Chats update every few seconds. Pause the bot on a chat to reply yourself.
            </Empty>}
      </section>
    </div>
  );
}

function ChatItem({ c, active }: { c: ConversationSummary; active: boolean }) {
  return (
    <li>
      <a href={href("conversations", c.wa_id)} className={`chat-item ${active ? "active" : ""}`} aria-current={active ? "true" : undefined}>
        <Avatar contact={c} />
        <div className="grow min0">
          <div className="chat-item-top">
            <span className="row-title ellipsis">{displayName(c)}</span>
            <span className="muted small nowrap">{ago(c.last_at)}</span>
          </div>
          <div className="chat-item-bottom">
            <span className="row-sub ellipsis">
              {c.last_direction === "out" && <span className="muted">↳ </span>}
              {c.last_at ? plainPreview(messageText(c.last_type, c.last_body)) : <em className="muted">No messages yet</em>}
            </span>
            {c.bot_paused ? <span className="badge badge-red">Paused</span> : <LangChip language={c.language} />}
          </div>
        </div>
      </a>
    </li>
  );
}

function Thread({ waId, onAuthError, onChanged }: { waId: string; onAuthError: () => void; onChanged: () => void }) {
  const { data, error, refresh } = useData(() => api.conversation(waId), [waId], { pollMs: 4000, onAuthError });
  const [showInfo, setShowInfo] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error && !data) return <ErrorNote error={error} onRetry={() => refresh()} />;
  if (!data) return <Skeleton rows={8} />;
  const { contact } = data;

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setActionError(null);
    try {
      await fn();
      await refresh(true);
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const togglePause = () => contact.bot_paused
    ? act("resume", () => api.resume(waId))
    : act("pause", () => api.pause(waId, "Teacher is replying from Catalyst"));

  return (
    <div className="thread">
      <header className="thread-head">
        <button className="btn btn-ghost btn-sm back" onClick={() => go("conversations")} aria-label="Back to the list">←</button>
        <Avatar contact={contact} size={40} />
        <div className="grow min0">
          <div className="thread-name ellipsis">{displayName(contact)}</div>
          <div className="row-sub">+{contact.wa_id}{contact.kind ? ` · ${contact.kind}` : ""}</div>
        </div>
        <div className="thread-actions">
        <label className="lang-select" title="The reply language when a message doesn't show one (e.g. “ok”)">
          <span className="sr-only">Language</span>
          <select value={contact.language} disabled={busy !== null}
            onChange={(e) => act("lang", () => api.setLanguage(waId, e.target.value as Language))}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_INFO[l].label}</option>)}
          </select>
        </label>
        <button className={`btn btn-sm ${contact.bot_paused ? "btn-soft" : "btn-warn"}`} onClick={togglePause} disabled={busy !== null}>
          <Glyph name="bot" size={15} />
          {contact.bot_paused ? "Hand back to bot" : "Take over"}
        </button>
        <button className={`btn btn-ghost btn-sm ${showInfo ? "on" : ""}`} onClick={() => setShowInfo((s) => !s)} aria-expanded={showInfo}>
          Details
        </button>
        </div>
      </header>

      {contact.bot_paused ? (
        <div className="banner banner-amber">
          <strong>Bot paused.</strong> {contact.paused_reason ?? ""} You're replying to this chat; the bot stays quiet until you hand it back.
        </div>
      ) : null}
      {actionError && <ErrorNote error={actionError} />}

      <div className="thread-body">
        <Messages messages={data.messages} />
        {showInfo && <ContactInfo data={data} />}
      </div>

      <Composer waId={waId} paused={Boolean(contact.bot_paused)}
        onSent={async () => { await refresh(true); onChanged(); }}
        onTakeOver={() => act("pause", () => api.pause(waId, "Teacher is replying from Catalyst"))} />
    </div>
  );
}

function Messages({ messages }: { messages: Message[] }) {
  const end = useRef<HTMLDivElement>(null);
  const last = messages.at(-1)?.id;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [last]);

  if (!messages.length) return <div className="messages"><Empty title="No messages yet" /></div>;
  let lastDay = "";
  return (
    <div className="messages" aria-live="polite">
      {messages.map((m) => {
        const day = dayLabel(m.created_at);
        const divider = day !== lastDay;
        lastDay = day;
        return (
          <div key={m.id} className="msg-wrap">
            {divider && <div className="day-divider"><span>{day}</span></div>}
            <div className={`msg msg-${m.direction} ${m.body ? "" : "msg-media"}`}>
              <div className="msg-body">{formatWhatsApp(messageText(m.type, m.body))}</div>
              <div className="msg-meta num">{clock(m.created_at)}</div>
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

// One-line preview: drop WhatsApp's *bold*/_italic_ markers and line breaks.
const plainPreview = (text: string) =>
  text.replace(/\*([^*\n]+)\*/g, "$1").replace(/_([^_\n]+)_/g, "$1").replace(/\s+/g, " ");

// WhatsApp's *bold* and _italic_ -> elements (no HTML injection: text stays text).
function formatWhatsApp(text: string) {
  return text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((part, i) => {
    if (/^\*[^*]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function Composer({ waId, paused, onSent, onTakeOver }: {
  waId: string; paused: boolean; onSent: () => Promise<void>; onTakeOver: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.reply(waId, body);
      setText("");
      await onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  if (!paused) {
    return (
      <div className="composer composer-locked">
        <span className="muted"><Glyph name="bot" size={15} /> The bot is answering this chat.</span>
        <button className="btn btn-sm btn-warn" onClick={onTakeOver}>Take over to reply</button>
      </div>
    );
  }
  return (
    <form className="composer" onSubmit={send}>
      {error && <ErrorNote error={error} />}
      <div className="composer-row">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4096}
          placeholder="Reply as the teacher… (Enter to send, Shift+Enter for a new line)"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          aria-label="Your reply" />
        <button className="btn btn-primary" disabled={sending || !text.trim()}>{sending ? "Sending…" : "Send"}</button>
      </div>
      <div className="muted small">Sent on WhatsApp from the business number. Use *bold* and _italic_ like in WhatsApp.</div>
    </form>
  );
}

function ContactInfo({ data }: { data: ConversationDetail }) {
  const { students, payments, owed, contact } = data;
  const open = payments.filter((p) => p.status !== "approved" && p.status !== "waived");
  return (
    <aside className="info">
      <div className="info-section">
        <div className="label">Language</div>
        <div className="info-lang"><LangChip language={contact.language} full /> <span className="muted small">{LANGUAGE_INFO[contact.language].hint}</span></div>
      </div>
      <div className="info-section">
        <div className="label">Students</div>
        {students.length === 0 && <div className="muted small">None yet: a new enquiry.</div>}
        {students.map((s) => (
          <div key={s.id} className="info-student">
            <div className="row-title">{s.name} {s.grade && <span className="muted small">· {s.grade}</span>}</div>
            {s.enrollments.map((e) => (
              <div key={e.class_id} className="row-sub">
                <span className={`dot dot-${e.status}`} /> {e.title} <span className="muted">({e.status})</span>
              </div>
            ))}
            {s.trials.map((t) => <div key={`t${t.id}`} className="row-sub">Trial: {t.class_title} · {t.date} ({t.status})</div>)}
            {s.bookings.map((b) => <div key={`b${b.id}`} className="row-sub">1-to-1: {b.subject_name} · {b.starts_at} ({b.status})</div>)}
          </div>
        ))}
      </div>
      <div className="info-section">
        <div className="label">Payments</div>
        <div className="info-owed"><span className="muted small">Owed</span> <span className="num">{money(owed)}</span></div>
        {open.map((p) => (
          <div key={p.id} className="row-sub">
            <span className={`pay pay-${p.status}`}>{p.status.replace("_", " ")}</span> {p.student_name.split(" ")[0]} · {p.class_title} · {p.month}
          </div>
        ))}
        {open.length === 0 && <div className="muted small">All settled.</div>}
      </div>
    </aside>
  );
}
