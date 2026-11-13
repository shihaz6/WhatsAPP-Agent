import { useCurrentFrame } from "remotion";
import { AppShell, AppWindow, Caption, Cursor, lkr, progress, stagger } from "../kit";
import { WINDOW, toVideo } from "./layout";

const SLIPS = [
  { name: "Dilini Perera", amount: 3500, cls: "2027 A/L Combined Maths – Theory" },
  { name: "Dilini Perera", amount: 3500, cls: "2027 A/L Physics – Theory" },
  { name: "Kasun Perera", amount: 2000, cls: "Grade 10 Maths – Theory" },
];
const OWED = [
  ["Mr. P. Wickramasinghe", "+94770000204", 3, 9000],
  ["Mohamed Rizwan", "+94770000105", 1, 3500],
  ["Mr. R. Fernando", "+94770000201", 1, 3500],
] as const;

export const APPROVE = { x: 1334, y: 318 };

export function PaymentsScene() {
  const frame = useCurrentFrame();
  const clickAt = 52;
  const approved = frame >= clickAt + 3;
  const collapse = progress(frame, clickAt + 22, clickAt + 42);
  const toast = progress(frame, clickAt + 8, clickAt + 24) * (1 - progress(frame, 150, 165));
  const count = approved ? 2 : 3;
  const pending = approved ? 5500 : 9000;

  return (
    <>
      <Caption step="04  Payments" title="Check slips in one click"
        body="Approve or reject bank slips. Parents hear the result from the bot." />
      <AppWindow {...WINDOW}>
        <AppShell tab="payments">
          <div className="stack-lg" style={{ position: "relative" }}>
            <header className="page-head" style={stagger(frame, 0, 0)}>
              <div><h1>Payments</h1><p className="page-sub">Review bank slips and follow up on outstanding fees.</p></div>
            </header>
            <section className="stats stats-2">
              <div className="stat" style={stagger(frame, 4, 0)}>
                <div className="stat-label"><span className="stat-dot tone-amber" />Slips to review</div>
                <div className="stat-value" style={{ color: approved ? "var(--accent-text)" : undefined }}>{count}</div>
                <div className="stat-note">{lkr(pending)}</div>
              </div>
              <div className="stat" style={stagger(frame, 4, 1)}>
                <div className="stat-label"><span className="stat-dot tone-neutral" />Outstanding</div>
                <div className="stat-value">{lkr(24500)}</div>
                <div className="stat-note">6 families</div>
              </div>
            </section>
            <section className="panel" style={stagger(frame, 10, 0)}>
              <div className="panel-head"><h2>Slips waiting for review</h2></div>
              <ul className="slips">
                {SLIPS.map((s, i) => {
                  const first = i === 0;
                  const style = first ? { maxHeight: 90 * (1 - collapse), opacity: 1 - collapse, overflow: "hidden", padding: `${12 * (1 - collapse)}px 4px` } : stagger(frame, 14, i);
                  return (
                    <li key={s.cls} className="slip" style={{ ...style, background: first && approved ? `rgba(34,160,107,${0.08 * (1 - collapse)})` : undefined, borderRadius: 8 }}>
                      <div className="slip-main">
                        <div className="grow min0">
                          <div className="row-title">{s.name} <span className="muted">·</span> <span className="num">{lkr(s.amount)}</span></div>
                          <div className="row-sub">{s.cls} · 2026-11 · Ref TRX-PERERA-01</div>
                          <div className="row-sub">Received 2h ago</div>
                        </div>
                        <div className="slip-actions">
                          {first && approved ? (
                            <span className="badge badge-green" style={{ height: 32, padding: "0 14px", fontSize: 13 }}>✓ Approved</span>
                          ) : (
                            <>
                              <button className="btn btn-sm btn-ghost">Reject</button>
                              <button className="btn btn-sm btn-primary">Approve</button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="panel" style={stagger(frame, 18, 0)}>
              <div className="panel-head"><h2>Outstanding fees</h2></div>
              <table className="table">
                <thead><tr><th>Contact</th><th className="num">Items</th><th className="num">Amount</th><th /></tr></thead>
                <tbody>
                  {OWED.map(([n, w, items, amt]) => (
                    <tr key={n}>
                      <td><div className="row-title">{n}</div><div className="row-sub">{w}</div></td>
                      <td className="num">{items}</td><td className="num">{lkr(amt)}</td>
                      <td className="num"><a className="small">Open chat</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
          <div className="toast" style={{ opacity: toast, transform: `translateY(${(1 - toast) * 20}px)` }}>
            <span className="toast-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
            <span><strong>Payment approved</strong> · Dilini Perera · {lkr(3500)}</span>
          </div>
        </AppShell>
      </AppWindow>
      <Cursor appear={14} clicks={[clickAt]} keys={[
        { f: 14, ...toVideo(1000, 600) },
        { f: 46, ...toVideo(APPROVE.x, APPROVE.y) },
        { f: 80, ...toVideo(APPROVE.x, APPROVE.y) },
        { f: 120, ...toVideo(1180, 520) },
      ]} />
    </>
  );
}
