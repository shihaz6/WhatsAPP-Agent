import { api } from "../api";
import { LANGUAGE_INFO, ago, classDate, displayName, greeting, money, todayInTz } from "../format";
import { href } from "../nav";
import type { Overview as OverviewData, Session } from "../types";
import { Avatar, Empty, ErrorNote, LangChip, PageHead, Skeleton, Stat, useData } from "../ui";

const today = () => new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "Asia/Colombo" }).format(new Date());

export function Overview({ onAuthError }: { onAuthError: () => void }) {
  const { data, error, refresh } = useData(api.overview, [], { pollMs: 15000, onAuthError });

  if (error && !data) return <ErrorNote error={error} onRetry={() => refresh()} />;
  if (!data) return <><PageHead title="Overview" sub={today()} /><Skeleton rows={6} /></>;

  const { counts, tutor } = data;
  const currency = tutor?.currency ?? "LKR";
  const firstName = tutor?.name?.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/, "").split(" ")[0];

  return (
    <div className="stack-lg">
      <PageHead title={`${greeting()}${firstName ? `, ${firstName}` : ""}`} sub={today()} />

      <section className="stats" aria-label="Key numbers">
        <Stat label="Messages (24h)" value={counts.messages_in_24h} note={`${counts.messages_out_24h} replies sent`} tone="green" />
        <Stat label="With the teacher" value={counts.paused} tone={counts.paused ? "amber" : "green"}
          note={counts.paused ? "Bot paused on these chats" : "Bot is handling every chat"} />
        <Stat label="Slips to review" value={counts.slips_waiting} tone={counts.slips_waiting ? "amber" : "green"}
          note={<a href={href("payments")}>Review payments</a>} />
        <Stat label="Outstanding" value={money(counts.owed_total, currency)} note="Due or rejected" />
        <Stat label="Students" value={counts.students} note={`${counts.active_enrollments} active enrolments`} />
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>This week</h2>
            <a className="small" href={href("classes")}>All classes</a>
          </div>
          <SessionList sessions={data.sessions} />
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Needs attention</h2></div>
            {data.paused.length === 0 && data.slips.length === 0 ? (
              <Empty title="All clear">The bot is answering everyone and no slips are waiting.</Empty>
            ) : (
              <ul className="list">
                {data.paused.map((c) => (
                  <li key={c.id}>
                    <a className="list-row" href={href("conversations", c.wa_id)}>
                      <Avatar contact={c} size={32} />
                      <div className="grow min0">
                        <div className="row-title">{displayName(c)}</div>
                        <div className="row-sub ellipsis">{c.paused_reason ?? "Handed to the teacher"}</div>
                      </div>
                      <span className="badge badge-amber">Bot paused</span>
                      <span className="muted small nowrap">{ago(c.paused_at)}</span>
                    </a>
                  </li>
                ))}
                {data.slips.map((p) => (
                  <li key={`slip-${p.id}`}>
                    <a className="list-row" href={href("payments")}>
                      <span className="icon-dot">Rs</span>
                      <div className="grow min0">
                        <div className="row-title">{p.student_name}</div>
                        <div className="row-sub ellipsis">{p.class_title} · {p.month}</div>
                      </div>
                      <span className="badge badge-blue">Slip</span>
                      <span className="small num">{money(p.amount, currency)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Languages</h2><span className="muted small">{counts.contacts} contacts</span></div>
            <LanguageMix languages={counts.languages} total={counts.contacts} />
          </section>
        </div>
      </div>
    </div>
  );
}

function SessionList({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) return <Empty title="No sessions this week" />;
  const now = todayInTz();
  const byDate = new Map<string, Session[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  return (
    <div className="days">
      {[...byDate].map(([date, list]) => (
        <div key={date} className="day">
          <div className="day-label">
            {classDate(date)}
            {date === now && <span className="badge badge-green">Today</span>}
          </div>
          {list.map((s) => (
            <div key={`${s.class_id}-${s.date}-${s.status}`} className={`session session-${s.status}`}>
              <span className="session-time num">{s.time}</span>
              <div className="grow min0">
                <div className="row-title">{s.title}</div>
                <div className="row-sub">
                  {s.status === "cancelled" && <span className="badge badge-red">Cancelled</span>}
                  {s.status === "rescheduled" && <span className="badge badge-amber">Moved from {classDate(s.original_date!)}</span>}
                  <span>{s.note ?? (s.mode === "online" ? "Online" : s.location?.split(",")[0])}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LanguageMix({ languages, total }: { languages: OverviewData["counts"]["languages"]; total: number }) {
  if (!total) return <Empty title="No contacts yet" />;
  return (
    <ul className="mix">
      {languages.map((l) => {
        const pct = Math.round((l.n / total) * 100);
        return (
          <li key={l.language}>
            <div className="mix-top">
              <span><LangChip language={l.language} />{l.language !== "en" && <span className="muted small"> {LANGUAGE_INFO[l.language]?.hint}</span>}</span>
              <span className="small num">{l.n} · {pct}%</span>
            </div>
            <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          </li>
        );
      })}
    </ul>
  );
}
