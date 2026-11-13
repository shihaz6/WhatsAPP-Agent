import { useCurrentFrame } from "remotion";
import { AppShell, AppWindow, Caption, lkr, progress, stagger, useCount } from "../kit";
import { WINDOW } from "./layout";

type Item = { t: string; title: string; sub: string; cancelled?: boolean };
const SESSIONS: { day: string; today?: boolean; items: Item[] }[] = [
  { day: "Wed 11 Nov", today: true, items: [{ t: "18:00", title: "A/L Combined Maths – Paper Class", sub: "Online" }] },
  { day: "Thu 12 Nov", items: [{ t: "18:30", title: "A/L Physics – Paper Class", sub: "Online" }] },
  { day: "Sat 14 Nov", items: [
    { t: "08:00", title: "2027 A/L Combined Maths – Theory", sub: "Hall unavailable this week", cancelled: true },
    { t: "13:30", title: "2027 A/L Physics – Theory", sub: "Hall B" },
  ] },
  { day: "Sun 15 Nov", items: [{ t: "08:00", title: "2026 A/L Combined Maths – Revision", sub: "Hall A" }] },
];

export function OverviewScene() {
  const frame = useCurrentFrame();
  const enter = progress(frame, 0, 34);
  // Slow push-in of the whole window after the content lands.
  const push = 0.02 * progress(frame, 60, 210);

  const msgs = useCount(0, 24, 22, 70);
  const replies = useCount(0, 23, 22, 70);
  const slips = useCount(0, 3, 30, 60);
  const owed = useCount(0, 24500, 30, 80);
  const students = useCount(0, 10, 30, 70);

  let i = 0;
  return (
    <>
      <Caption step="01  Overview" title="Your whole day at a glance" body="Messages, classes, cancellations and payment slips, live from WhatsApp." />
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 60}px) scale(${0.97 + 0.03 * enter + push})`, transformOrigin: "1210px 540px", position: "absolute", inset: 0 }}>
        <AppWindow {...WINDOW}>
          <AppShell tab="overview">
            <div className="stack-lg">
              <header className="page-head" style={stagger(frame, 10, 0)}>
                <div><h1>Good afternoon, Nuwan</h1><p className="page-sub">Wednesday, 11 November 2026</p></div>
              </header>
              <section className="stats">
                {[
                  { label: "Messages (24h)", value: msgs, note: `${replies} replies sent`, tone: "green" },
                  { label: "With the teacher", value: 0, note: "Bot is handling every chat", tone: "green" },
                  { label: "Slips to review", value: slips, note: "Review payments", tone: "amber", link: true },
                  { label: "Outstanding", value: lkr(owed), note: "Due or rejected", tone: "neutral" },
                  { label: "Students", value: students, note: "14 active enrolments", tone: "neutral" },
                ].map((s, k) => (
                  <div key={s.label} className="stat" style={stagger(frame, 14, k, 4, 20)}>
                    <div className="stat-label"><span className={`stat-dot tone-${s.tone}`} />{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-note" style={s.link ? { color: "var(--accent-text)", fontWeight: 500 } : undefined}>{s.note}</div>
                  </div>
                ))}
              </section>
              <div className="grid-2">
                <section className="panel" style={stagger(frame, 34, 0, 0, 24)}>
                  <div className="panel-head"><h2>This week</h2><a className="small">All classes</a></div>
                  <div className="days">
                    {SESSIONS.map((d) => (
                      <div key={d.day} className="day" style={stagger(frame, 44, i++, 6)}>
                        <div className="day-label">{d.day}{d.today && <span className="badge badge-green">Today</span>}</div>
                        {d.items.map((s) => (
                          <div key={s.title} className={`session ${s.cancelled ? "session-cancelled" : ""}`}>
                            <span className="session-time num">{s.t}</span>
                            <div className="grow min0">
                              <div className="row-title">{s.title}</div>
                              <div className="row-sub">{s.cancelled && <span className="badge badge-red">Cancelled</span>}<span>{s.sub}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
                <div className="stack">
                  <section className="panel" style={stagger(frame, 40, 0, 0, 24)}>
                    <div className="panel-head"><h2>Needs attention</h2></div>
                    <ul className="list">
                      {[["Dilini Perera", "2027 A/L Combined Maths – Theory", "LKR 3,500"], ["Dilini Perera", "2027 A/L Physics – Theory", "LKR 3,500"], ["Kasun Perera", "Grade 10 Maths – Theory", "LKR 2,000"]].map(([n, c, a], k) => (
                        <li key={c} style={stagger(frame, 52, k, 5)}>
                          <div className="list-row">
                            <span className="icon-dot">Rs</span>
                            <div className="grow min0"><div className="row-title">{n}</div><div className="row-sub ellipsis">{c} · 2026-11</div></div>
                            <span className="badge badge-blue">Slip</span><span className="small num">{a}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="panel" style={stagger(frame, 48, 0, 0, 24)}>
                    <div className="panel-head"><h2>Languages</h2><span className="muted small">10 contacts</span></div>
                    <ul className="mix">
                      {[["en", "English", 60], ["singlish", "Singlish", 20], ["tanglish", "Tanglish", 10], ["si", "Sinhala", 10]].map(([code, label, pct], k) => (
                        <li key={code}>
                          <div className="mix-top"><span className={`lang lang-${code}`}>{label}</span><span className="small num">{pct}%</span></div>
                          <div className="bar"><span style={{ width: `${(pct as number) * progress(frame, 60 + k * 5, 95 + k * 5)}%` }} /></div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </AppShell>
        </AppWindow>
      </div>
    </>
  );
}
