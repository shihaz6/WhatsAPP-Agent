// Small shared pieces: stat cards, language chips, avatars, data loading.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AuthError } from "./api";
import { LANGUAGE_INFO, initials } from "./format";
import type { Language } from "./types";

// A key number. `tone` only colours a small status dot, so the page stays calm.
export function Stat({ label, value, note, tone = "neutral" }: {
  label: string; value: ReactNode; note?: ReactNode; tone?: "neutral" | "green" | "amber" | "red";
}) {
  return (
    <div className="stat">
      <div className="stat-label"><span className={`stat-dot tone-${tone}`} />{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function LangChip({ language, full = false }: { language: Language; full?: boolean }) {
  const info = LANGUAGE_INFO[language] ?? LANGUAGE_INFO.en;
  return (
    <span className={`lang lang-${language}`} title={info.hint}>
      {full ? info.native : info.label}
    </span>
  );
}

export function Avatar({ contact, size = 38 }: { contact: { name: string | null; wa_id: string; language: Language }; size?: number }) {
  return (
    <span className={`avatar lang-ring-${contact.language}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(contact)}
    </span>
  );
}

export function Empty({ glyph, title, children }: { glyph?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {glyph && <div className="empty-glyph">{glyph}</div>}
      <div className="empty-title">{title}</div>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="error-note" role="alert">
      <span>{error}</span>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton-row" style={{ width: `${90 - i * 12}%` }} />)}
    </div>
  );
}

// Load data, optionally refreshing every `pollMs`. A 401 signs the user out.
export function useData<T>(load: () => Promise<T>, deps: unknown[], { pollMs, onAuthError }: { pollMs?: number; onAuthError: () => void }) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const d = await loadRef.current();
      setData(d);
      setError(null);
    } catch (err) {
      if (err instanceof AuthError) return onAuthError();
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    setData(null);
    refresh();
    if (!pollMs) return;
    const t = setInterval(() => { if (!document.hidden) refresh(true); }, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { data, error, loading, refresh, setData };
}

export function PageHead({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-head-actions">{children}</div>}
    </header>
  );
}
