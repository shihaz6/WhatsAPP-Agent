// Classes: what the bot offers, and the next two weeks of sessions. The teacher adds and edits
// classes here, and cancels or moves a session right where it's listed. The bot sees every change
// on the next message.

import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { Glyph } from "../Glyph";
import { classDate, money, todayInTz } from "../format";
import type { ClassInfo, ClassInput, Session, Subject } from "../types";
import { Empty, ErrorNote, PageHead, Skeleton, useData } from "../ui";
import { DAYS } from "./Settings";

const TYPE_LABEL: Record<ClassInfo["class_type"], string> = { theory: "Theory", revision: "Revision", paper: "Paper class" };

// Same busy/error handling as Settings, kept local so each card has its own.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try { await fn(); return true; } catch (err) { setError(err instanceof Error ? err.message : String(err)); return false; } finally { setBusy(false); }
  }
  return { busy, error, run, setError };
}

export function Classes({ onAuthError }: { onAuthError: () => void }) {
  const { data, error, refresh } = useData(api.classes, [], { pollMs: 60000, onAuthError });
  const [editing, setEditing] = useState<ClassInfo | "new" | null>(null);

  if (error && !data) return <ErrorNote error={error} onRetry={() => refresh()} />;
  if (!data) return <><PageHead title="Classes" /><Skeleton rows={6} /></>;
  const reload = () => refresh(true);

  const nextBy = new Map<number, Session[]>();
  for (const s of data.sessions) nextBy.set(s.class_id, [...(nextBy.get(s.class_id) ?? []), s]);

  return (
    <div className="stack-lg">
      <PageHead title="Classes" sub={`${data.classes.length} classes the bot offers, with sessions for the next two weeks.`}>
        <button className="btn btn-primary" onClick={() => setEditing("new")} disabled={data.subjects.length === 0}
          title={data.subjects.length === 0 ? "Add a subject in Settings first" : undefined}>
          <Glyph name="plus" size={16} /> New class
        </button>
      </PageHead>

      {data.classes.length === 0 && (
        <Empty glyph={<Glyph name="calendar" size={32} />} title="No classes yet">
          {data.subjects.length === 0 ? "Add your subjects in Settings, then add a class here." : "Add a class and the bot will start offering it."}
        </Empty>
      )}
      <div className="class-grid">
        {data.classes.map((c) => <ClassCard key={c.id} c={c} sessions={nextBy.get(c.id) ?? []} onEdit={() => setEditing(c)} onChanged={reload} />)}
      </div>

      {data.hidden.length > 0 && <HiddenClasses classes={data.hidden} onChanged={reload} />}

      {editing && (
        <ClassForm c={editing === "new" ? null : editing} subjects={data.subjects}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </div>
  );
}

function ClassCard({ c, sessions, onEdit, onChanged }: { c: ClassInfo; sessions: Session[]; onEdit: () => void; onChanged: () => void }) {
  const full = c.seats_left === 0;
  const pct = c.capacity ? Math.min(100, Math.round((c.enrolled_count / c.capacity) * 100)) : 0;
  const { busy, error, run } = useAction();

  async function hide() {
    if (confirm(`Hide "${c.title}"? The bot stops offering it. Its students and payments stay, and you can restore it.`)
      && await run(() => api.setClassActive(c.id, false))) onChanged();
  }

  return (
    <article className={`class-card ${full ? "is-full" : ""}`}>
      <div className="class-card-head">
        <div className="grow min0">
          <h3 className="class-title">{c.title}</h3>
          <div className="row-sub">{c.subject_name} · {c.subject_level} · {TYPE_LABEL[c.class_type]}</div>
        </div>
        <span className={`badge ${c.mode === "online" ? "badge-blue" : "badge-neutral"}`}>{c.mode === "online" ? "Online" : "In person"}</span>
      </div>

      <dl className="class-facts">
        <div><dt>Weekly</dt><dd>{c.day_name} {c.start_time} · {c.duration_minutes} min</dd></div>
        <div><dt>Fee</dt><dd className="num">{money(c.monthly_fee)}/mo</dd></div>
        {c.location && <div><dt>{c.mode === "online" ? "Link" : "Where"}</dt><dd className="ellipsis" title={c.location}>{c.location}</dd></div>}
      </dl>

      {c.capacity != null && (
        <div className="seats">
          <div className="seats-top">
            <span className="small">{c.enrolled_count} / {c.capacity} enrolled</span>
            <span className={`small ${full ? "text-ember" : "muted"}`}>{full ? "Full" : `${c.seats_left} seats left`}</span>
          </div>
          <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={c.capacity} aria-valuenow={c.enrolled_count}
            aria-label={`${c.enrolled_count} of ${c.capacity} seats taken`}>
            <span style={{ width: `${pct}%` }} className={pct >= 90 ? "hot" : ""} />
          </div>
        </div>
      )}

      <ul className="next-sessions">
        {sessions.length === 0 && <li className="muted small">No sessions in the next two weeks.</li>}
        {sessions.map((s) => <SessionRow key={`${s.original_date ?? s.date}-${s.status}`} s={s} onChanged={onChanged} />)}
      </ul>

      {error && <ErrorNote error={error} />}
      <div className="card-actions">
        <button className="btn btn-sm btn-ghost" onClick={onEdit}>Edit</button>
        <button className="btn btn-sm btn-ghost" disabled={busy} onClick={hide}>Hide</button>
      </div>
    </article>
  );
}

// One upcoming session: cancel it, move it, or undo a cancellation/move.
function SessionRow({ s, onChanged }: { s: Session; onChanged: () => void }) {
  const today = todayInTz();
  const weekly = s.original_date ?? s.date; // the class's normal date for this session
  const [mode, setMode] = useState<"cancel" | "move" | null>(null);
  const [note, setNote] = useState("");
  const [newDate, setNewDate] = useState(s.date);
  const [newTime, setNewTime] = useState(s.time);
  const { busy, error, run } = useAction();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() => mode === "cancel"
      ? api.cancelSession(s.class_id, weekly, note)
      : api.moveSession(s.class_id, weekly, newDate, newTime, note));
    if (ok) { setMode(null); onChanged(); }
  }
  async function undo() {
    if (await run(() => api.restoreSession(s.class_id, weekly))) onChanged();
  }

  return (
    <li className={`ns ns-${s.status} ${s.date === today ? "is-today" : ""}`}>
      <span className="ns-date">{classDate(s.date)}</span>
      <span className="num">{s.time}</span>
      {s.status === "cancelled" && <span className="badge badge-red">Cancelled</span>}
      {s.status === "rescheduled" && <span className="badge badge-amber">Moved from {classDate(weekly)}</span>}
      <span className="ns-actions">
        {s.status === "scheduled"
          ? (<>
              <button className="link-btn" onClick={() => setMode(mode === "cancel" ? null : "cancel")}>Cancel</button>
              <button className="link-btn" onClick={() => setMode(mode === "move" ? null : "move")}>Move</button>
            </>)
          : <button className="link-btn" disabled={busy} onClick={undo}>Undo</button>}
      </span>
      {s.note && <span className="ns-note" title={s.note}>{s.note}</span>}

      {mode && (
        <form className="ns-form" onSubmit={submit}>
          {mode === "move" && (
            <div className="inline-form">
              <input aria-label="New date" type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              <input aria-label="New time" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            </div>
          )}
          <input aria-label="Note for parents" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={mode === "cancel" ? "Reason the bot can give, e.g. Poya day (optional)" : "Note the bot can give (optional)"} />
          {error && <ErrorNote error={error} />}
          <div className="form-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setMode(null)}>Keep as is</button>
            <button className={`btn btn-sm ${mode === "cancel" ? "btn-danger" : "btn-primary"}`} disabled={busy}>
              {mode === "cancel" ? "Cancel this session" : "Move session"}
            </button>
          </div>
        </form>
      )}
      {!mode && error && <ErrorNote error={error} />}
    </li>
  );
}

function HiddenClasses({ classes, onChanged }: { classes: ClassInfo[]; onChanged: () => void }) {
  const { busy, error, run } = useAction();
  return (
    <section className="panel">
      <div className="panel-head"><h2>Hidden classes</h2><span className="muted small">The bot doesn't offer these.</span></div>
      <ul className="list">
        {classes.map((c) => (
          <li key={c.id} className="list-row">
            <div className="grow min0">
              <div className="row-title">{c.title}</div>
              <div className="row-sub">{c.day_name} {c.start_time} · {money(c.monthly_fee)}/mo · {c.enrolled_count} enrolled</div>
            </div>
            <button className="btn btn-sm btn-ghost" disabled={busy} onClick={async () => { if (await run(() => api.setClassActive(c.id, true))) onChanged(); }}>Restore</button>
          </li>
        ))}
      </ul>
      {error && <ErrorNote error={error} />}
    </section>
  );
}

// ---------- New / edit class ----------

function ClassForm({ c, subjects, onClose, onSaved }: { c: ClassInfo | null; subjects: Subject[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ClassInput>(() => ({
    title: c?.title ?? "", subject_id: c?.subject_id ?? subjects[0]?.id ?? "", class_type: c?.class_type ?? "theory",
    mode: c?.mode ?? "physical", location: c?.location ?? "", day_of_week: c?.day_of_week ?? 6,
    start_time: c?.start_time ?? "", duration_minutes: c?.duration_minutes ?? 120, monthly_fee: c?.monthly_fee ?? "",
    capacity: c?.capacity ?? "",
  }));
  const { busy, error, run } = useAction();
  const set = <K extends keyof ClassInput>(k: K) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.saveClass(c?.id ?? null, form))) onSaved();
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="class-form-title" onSubmit={submit}>
        <h2 id="class-form-title">{c ? "Edit class" : "New class"}</h2>
        <p className="muted small">The bot offers this class with exactly these details.</p>
        <div className="form-grid">
          <label className="field span-2"><span>Title</span>
            <input value={form.title} onChange={set("title")} placeholder="e.g. Grade 10 Maths – Theory" autoFocus required />
          </label>
          <label className="field"><span>Subject</span>
            <select value={form.subject_id} onChange={set("subject_id")}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
            </select>
          </label>
          <label className="field"><span>Type</span>
            <select value={form.class_type} onChange={set("class_type")}>
              <option value="theory">Theory</option><option value="revision">Revision</option><option value="paper">Paper class</option>
            </select>
          </label>
          <label className="field"><span>Held</span>
            <select value={form.mode} onChange={set("mode")}>
              <option value="physical">In person</option><option value="online">Online</option>
            </select>
          </label>
          <label className="field"><span>{form.mode === "online" ? "Meeting link" : "Venue"}</span>
            <input value={form.location} onChange={set("location")} required={form.mode === "physical"}
              placeholder={form.mode === "online" ? "Zoom link (only sent to enrolled students)" : "e.g. Room 3, 45 Galle Road, Colombo 06"} />
          </label>
          <label className="field"><span>Day</span>
            <select value={form.day_of_week} onChange={set("day_of_week")}>
              {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </label>
          <label className="field"><span>Starts at</span>
            <input type="time" value={form.start_time} onChange={set("start_time")} required />
          </label>
          <label className="field"><span>Length (minutes)</span>
            <input inputMode="numeric" value={form.duration_minutes} onChange={set("duration_minutes")} required />
          </label>
          <label className="field"><span>Monthly fee (LKR)</span>
            <input inputMode="numeric" value={form.monthly_fee} onChange={set("monthly_fee")} placeholder="e.g. 2500" required />
          </label>
          <label className="field"><span>Seats</span>
            <input inputMode="numeric" value={form.capacity} onChange={set("capacity")} placeholder="Leave empty for no limit" />
          </label>
        </div>
        {error && <ErrorNote error={error} />}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : c ? "Save class" : "Add class"}</button>
        </div>
      </form>
    </div>
  );
}
