import { api } from "../api";
import { Glyph } from "../Glyph";
import { classDate, money, todayInTz } from "../format";
import type { ClassInfo, Session } from "../types";
import { Empty, ErrorNote, PageHead, Skeleton, useData } from "../ui";

const TYPE_LABEL: Record<ClassInfo["class_type"], string> = { theory: "Theory", revision: "Revision", paper: "Paper class" };

export function Classes({ onAuthError }: { onAuthError: () => void }) {
  const { data, error, refresh } = useData(api.classes, [], { pollMs: 60000, onAuthError });

  if (error && !data) return <ErrorNote error={error} onRetry={() => refresh()} />;
  if (!data) return <><PageHead title="Classes" /><Skeleton rows={6} /></>;

  const nextBy = new Map<number, Session[]>();
  for (const s of data.sessions) nextBy.set(s.class_id, [...(nextBy.get(s.class_id) ?? []), s]);

  return (
    <div className="stack-lg">
      <PageHead title="Classes" sub={`${data.classes.length} active classes, with sessions for the next two weeks.`} />
      {data.classes.length === 0 && <Empty glyph={<Glyph name="calendar" size={32} />} title="No active classes" />}
      <div className="class-grid">
        {data.classes.map((c) => <ClassCard key={c.id} c={c} sessions={nextBy.get(c.id) ?? []} />)}
      </div>
    </div>
  );
}

function ClassCard({ c, sessions }: { c: ClassInfo; sessions: Session[] }) {
  const full = c.seats_left === 0;
  const pct = c.capacity ? Math.min(100, Math.round((c.enrolled_count / c.capacity) * 100)) : 0;
  const today = todayInTz();
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
        {c.mode === "physical" && c.location && <div><dt>Where</dt><dd>{c.location}</dd></div>}
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
        {sessions.map((s) => (
          <li key={`${s.date}-${s.status}`} className={`ns ns-${s.status} ${s.date === today ? "is-today" : ""}`}>
            <span className="ns-date">{classDate(s.date)}</span>
            <span className="num">{s.time}</span>
            {s.status === "cancelled" && <span className="badge badge-red">Cancelled</span>}
            {s.status === "rescheduled" && <span className="badge badge-amber">Moved</span>}
            {s.note && <span className="ns-note" title={s.note}>{s.note}</span>}
          </li>
        ))}
      </ul>
    </article>
  );
}
