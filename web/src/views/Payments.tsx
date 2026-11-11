import { useState } from "react";
import { api } from "../api";
import { ago, displayName, money } from "../format";
import { href } from "../nav";
import type { Payment } from "../types";
import { Empty, ErrorNote, PageHead, Skeleton, Stat, useData } from "../ui";

export function Payments({ onAuthError }: { onAuthError: () => void }) {
  const { data, error, refresh } = useData(api.payments, [], { pollMs: 20000, onAuthError });

  if (error && !data) return <ErrorNote error={error} onRetry={() => refresh()} />;
  if (!data) return <><PageHead title="Payments" /><Skeleton rows={6} /></>;

  const owedTotal = data.owed.reduce((sum, o) => sum + o.total, 0);
  const slipTotal = data.slips.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="stack-lg">
      <PageHead title="Payments" sub="Review bank slips and follow up on outstanding fees." />

      <section className="stats stats-2">
        <Stat label="Slips to review" value={data.slips.length} tone={data.slips.length ? "amber" : "green"} note={money(slipTotal)} />
        <Stat label="Outstanding" value={money(owedTotal)} note={`${data.owed.length} families`} />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Slips waiting for review</h2></div>
        {data.slips.length === 0
          ? <Empty title="No slips to review">New slips appear here when parents send them.</Empty>
          : <ul className="slips">{data.slips.map((p) => <SlipRow key={p.id} p={p} onDone={() => refresh(true)} />)}</ul>}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Outstanding fees</h2></div>
        {data.owed.length === 0 ? <Empty title="Everyone is paid up" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Contact</th><th className="num">Items</th><th className="num">Amount</th><th /></tr></thead>
              <tbody>
                {data.owed.map((o) => (
                  <tr key={o.contact_id}>
                    <td><div className="row-title">{displayName(o)}</div><div className="row-sub">+{o.wa_id}</div></td>
                    <td className="num">{o.items}</td>
                    <td className="num">{money(o.total)}</td>
                    <td className="num"><a className="small" href={href("conversations", o.wa_id)}>Open chat</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SlipRow({ p, onDone }: { p: Payment; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try { await fn(); onDone(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false); }
  }

  return (
    <li className="slip">
      <div className="slip-main">
        <div className="grow min0">
          <div className="row-title">{p.student_name} <span className="muted">·</span> <span className="num">{money(p.amount)}</span></div>
          <div className="row-sub">{p.class_title} · {p.month}{p.slip_reference ? ` · Ref ${p.slip_reference}` : ""}</div>
          <div className="row-sub">Received {ago(p.slip_received_at)} ago</div>
        </div>
        {!rejecting && (
          <div className="slip-actions">
            <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>Reject</button>
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => run(() => api.approve(p.id))}>Approve</button>
          </div>
        )}
      </div>
      {rejecting && (
        <form className="reject-form" onSubmit={(e) => { e.preventDefault(); if (reason.trim()) run(() => api.reject(p.id, reason.trim())); }}>
          <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason, e.g. “Amount is LKR 2,000, fee is 2,500”" aria-label="Reason for rejecting" />
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
          <button className="btn btn-sm btn-warn" disabled={busy || !reason.trim()}>Reject slip</button>
        </form>
      )}
      {rejecting && <div className="row-sub">The bot tells the parent this reason when they ask about fees.</div>}
      {error && <ErrorNote error={error} />}
    </li>
  );
}
