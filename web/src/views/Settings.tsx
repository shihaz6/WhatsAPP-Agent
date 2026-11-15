// Settings: everything the bot tells parents that isn't a class. Each section says where the bot
// uses it. Changes reach the bot on the next message; no restart needed.

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../api";
import { money } from "../format";
import type { Faq, Slot, SubjectSetting, TutorProfile } from "../types";
import { ErrorNote, PageHead, Skeleton, useData } from "../ui";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Runs a save/delete, keeping track of busy state and the error to show.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}

export function Settings({ onAuthError }: { onAuthError: () => void }) {
  const { data, error, refresh } = useData(api.settings, [], { onAuthError });

  if (error && !data) return <ErrorNote error={error} onRetry={() => refresh()} />;
  if (!data) return <><PageHead title="Settings" /><Skeleton rows={6} /></>;
  const reload = () => refresh(true);

  return (
    <div className="stack-lg">
      <PageHead title="Settings" sub="What the bot tells parents and students. Changes apply to the next message." />
      <TutorSection tutor={data.tutor} onSaved={reload} />
      <SubjectsSection subjects={data.subjects} currency={data.tutor?.currency ?? "LKR"} onChanged={reload} />
      <SlotsSection slots={data.availability} onChanged={reload} />
      <FaqSection faqs={data.faqs} onChanged={reload} />
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: ReactNode; children: ReactNode }) {
  return (
    <section className="panel settings-section">
      <div className="settings-head">
        <h2>{title}</h2>
        <p className="muted small">{sub}</p>
      </div>
      {children}
    </section>
  );
}

// ---------- Teacher & payment details ----------

function TutorSection({ tutor, onSaved }: { tutor: TutorProfile | null; onSaved: () => void }) {
  const initial = {
    name: tutor?.name ?? "", bio: tutor?.bio ?? "", qualifications: tutor?.qualifications ?? "",
    payment_instructions: tutor?.payment_instructions ?? "",
  };
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();
  useEffect(() => { setForm(initial); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tutor]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => { setSaved(false); setForm({ ...form, [k]: e.target.value }); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.saveTutor(form))) { setSaved(true); onSaved(); }
  }

  return (
    <Section title="Teacher & payment details" sub="The bot introduces itself as your assistant and gives these bank details when someone asks how to pay.">
      <form className="form-grid" onSubmit={submit}>
        <label className="field"><span>Teacher's name</span>
          <input value={form.name} onChange={set("name")} placeholder="e.g. Mr. N. Perera" required />
        </label>
        <label className="field"><span>Qualifications</span>
          <input value={form.qualifications} onChange={set("qualifications")} placeholder="e.g. BSc (Hons) Mathematics, University of Colombo" />
        </label>
        <label className="field span-2"><span>About the teacher</span>
          <textarea rows={2} value={form.bio} onChange={set("bio")} placeholder="Subjects, years of experience, where you teach" />
        </label>
        <label className="field span-2"><span>How to pay</span>
          <textarea rows={3} value={form.payment_instructions} onChange={set("payment_instructions")}
            placeholder="Bank, account number, account name, branch, and what to send after paying" />
          <small className="muted">Sent to parents word for word. Check the account number carefully.</small>
        </label>
        {error && <div className="span-2"><ErrorNote error={error} /></div>}
        <div className="form-actions span-2">
          {saved && !dirty && <span className="saved-note">Saved</span>}
          <button className="btn btn-primary" disabled={busy || !dirty || !form.name.trim()}>{busy ? "Saving…" : "Save details"}</button>
        </div>
      </form>
    </Section>
  );
}

// ---------- Subjects & one-to-one rates ----------

function SubjectsSection({ subjects, currency, onChanged }: { subjects: SubjectSetting[]; currency: string; onChanged: () => void }) {
  return (
    <Section title="Subjects & one-to-one rates"
      sub="The bot tells people these are the only subjects you teach. Leave the rate empty if you don't do one-to-one for a subject.">
      <div className="table-wrap">
        <table className="table edit-table">
          <thead>
            <tr><th>Subject</th><th>Level</th><th className="num">One-to-one, per hour ({currency})</th><th>Classes</th><th /></tr>
          </thead>
          <tbody>
            {subjects.map((s) => <SubjectRow key={s.id} s={s} currency={currency} onChanged={onChanged} />)}
            <SubjectRow key={`new-${subjects.length}`} currency={currency} onChanged={onChanged} />
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function SubjectRow({ s, currency, onChanged }: { s?: SubjectSetting; currency: string; onChanged: () => void }) {
  const initial = { name: s?.name ?? "", level: s?.level ?? "", hourly_rate: s?.hourly_rate == null ? "" : String(s.hourly_rate) };
  const [form, setForm] = useState(initial);
  const { busy, error, run } = useAction();
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    if (await run(() => api.saveSubject(s?.id ?? null, form))) onChanged();
  }
  async function remove() {
    if (s && confirm(`Delete ${s.name} (${s.level})?`) && await run(() => api.deleteSubject(s.id))) onChanged();
  }

  return (
    <>
      <tr className={s ? "" : "new-row"}>
        <td><input aria-label="Subject" value={form.name} onChange={set("name")} placeholder={s ? "" : "Add a subject, e.g. Chemistry"} /></td>
        <td><input aria-label="Level" className="w-sm" value={form.level} onChange={set("level")} placeholder="O/L, A/L, Grade 9" /></td>
        <td className="num"><input aria-label="One-to-one rate per hour" className="w-sm num" inputMode="numeric" value={form.hourly_rate}
          onChange={set("hourly_rate")} placeholder="Not offered" title={form.hourly_rate ? money(Number(form.hourly_rate), currency) : ""} /></td>
        <td className="muted small">{s ? s.class_count : ""}</td>
        <td className="row-actions">
          {(dirty || !s) && <button className="btn btn-sm btn-primary" disabled={busy || !form.name.trim() || !form.level.trim()} onClick={save}>{s ? "Save" : "Add"}</button>}
          {s && !dirty && <button className="btn btn-sm btn-ghost" disabled={busy || s.class_count > 0} onClick={remove}
            title={s.class_count > 0 ? "Classes use this subject" : "Delete"}>Delete</button>}
        </td>
      </tr>
      {error && <tr><td colSpan={5}><ErrorNote error={error} /></td></tr>}
    </>
  );
}

// ---------- Free slots for one-to-one ----------

function SlotsSection({ slots, onChanged }: { slots: Slot[]; onChanged: () => void }) {
  const [form, setForm] = useState({ day_of_week: 6, start_time: "", end_time: "" });
  const { busy, error, run } = useAction();

  async function add(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.addSlot(form))) { setForm({ ...form, start_time: "", end_time: "" }); onChanged(); }
  }
  async function remove(id: number) {
    if (await run(() => api.deleteSlot(id))) onChanged();
  }

  return (
    <Section title="Free time for one-to-one" sub="The weekly times the bot says you're free for one-to-one sessions.">
      {slots.length === 0 && <p className="muted small">No free times yet. The bot will say one-to-one times are arranged with you.</p>}
      <ul className="chips">
        {slots.map((s) => (
          <li key={s.id} className="chip">
            <span>{s.day_name} <span className="num">{s.start_time}–{s.end_time}</span></span>
            <button className="chip-x" aria-label={`Remove ${s.day_name} ${s.start_time}`} disabled={busy} onClick={() => remove(s.id)}>×</button>
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={add}>
        <select aria-label="Day" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}>
          {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
        </select>
        <input aria-label="From" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
        <span className="muted">to</span>
        <input aria-label="To" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
        <button className="btn btn-sm btn-primary" disabled={busy || !form.start_time || !form.end_time}>Add time</button>
      </form>
      {error && <ErrorNote error={error} />}
    </Section>
  );
}

// ---------- FAQs ----------

function FaqSection({ faqs, onChanged }: { faqs: Faq[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <Section title="Common questions"
      sub="The bot reads all of these and answers from them: missed classes, refunds, trials, what to bring. Write each answer as you'd want parents to hear it.">
      <div className="faq-list">
        {faqs.map((f) => <FaqItem key={f.id} faq={f} onChanged={onChanged} />)}
        {faqs.length === 0 && !adding && <p className="muted small">No questions yet.</p>}
        {adding
          ? <FaqItem onChanged={() => { setAdding(false); onChanged(); }} onCancel={() => setAdding(false)} />
          : <button className="btn btn-sm btn-ghost add-btn" onClick={() => setAdding(true)}>+ Add a question</button>}
      </div>
    </Section>
  );
}

function FaqItem({ faq, onChanged, onCancel }: { faq?: Faq; onChanged: () => void; onCancel?: () => void }) {
  const [editing, setEditing] = useState(!faq);
  const [form, setForm] = useState({ question: faq?.question ?? "", answer: faq?.answer ?? "" });
  const { busy, error, run } = useAction();

  async function save(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.saveFaq(faq?.id ?? null, form))) { setEditing(false); onChanged(); }
  }
  async function remove() {
    if (faq && confirm("Delete this question?") && await run(() => api.deleteFaq(faq.id))) onChanged();
  }

  if (!editing && faq) {
    return (
      <div className="faq">
        <div className="grow min0">
          <div className="row-title">{faq.question}</div>
          <div className="faq-answer">{faq.answer}</div>
        </div>
        <div className="row-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-sm btn-ghost" disabled={busy} onClick={remove}>Delete</button>
        </div>
        {error && <ErrorNote error={error} />}
      </div>
    );
  }
  return (
    <form className="faq faq-editing" onSubmit={save}>
      <label className="field"><span>Question</span>
        <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="e.g. Can my child join in the middle of the term?" autoFocus />
      </label>
      <label className="field"><span>Answer</span>
        <textarea rows={3} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
      </label>
      {error && <ErrorNote error={error} />}
      <div className="form-actions">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setForm({ question: faq?.question ?? "", answer: faq?.answer ?? "" }); setEditing(false); onCancel?.(); }}>Cancel</button>
        <button className="btn btn-sm btn-primary" disabled={busy || !form.question.trim() || !form.answer.trim()}>{busy ? "Saving…" : faq ? "Save" : "Add question"}</button>
      </div>
    </form>
  );
}
