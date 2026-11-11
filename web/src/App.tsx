import { useEffect, useState } from "react";
import { session, signIn, signOut } from "./api";
import { Glyph, Logo, type GlyphName } from "./Glyph";
import { readHash, type View } from "./nav";
import { Overview } from "./views/Overview";
import { Conversations } from "./views/Conversations";
import { Classes } from "./views/Classes";
import { Payments } from "./views/Payments";

const NAV: { id: View; label: string; glyph: GlyphName }[] = [
  { id: "overview", label: "Overview", glyph: "grid" },
  { id: "conversations", label: "Conversations", glyph: "chat" },
  { id: "classes", label: "Classes", glyph: "calendar" },
  { id: "payments", label: "Payments", glyph: "wallet" },
];

function Brand() {
  return (
    <div className="brand">
      <Logo />
      <div className="brand-text">
        <span className="brand-product">Catalyst</span>
        <span className="brand-company">by AlchemyX</span>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(session.get()));
  const [route, setRoute] = useState(readHash);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const logout = () => { signOut(); setAuthed(false); };
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;
  const props = { onAuthError: logout };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.id} href={`#/${n.id}`} className={`nav-item ${route.view === n.id ? "active" : ""}`}
              aria-current={route.view === n.id ? "page" : undefined}>
              <Glyph name={n.glyph} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <button className="nav-item sidebar-foot" onClick={logout}>
          <Glyph name="logout" />
          <span>Sign out</span>
        </button>
      </aside>

      <header className="mobile-top">
        <Brand />
        <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
      </header>

      <main className="main" key={route.view}>
        {route.view === "overview" && <Overview {...props} />}
        {route.view === "conversations" && <Conversations {...props} selected={route.arg} />}
        {route.view === "classes" && <Classes {...props} />}
        {route.view === "payments" && <Payments {...props} />}
      </main>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(key.trim());
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signin">
      <form className="signin-card" onSubmit={submit}>
        <Brand />
        <div>
          <h1 className="signin-title">Sign in</h1>
          <p className="signin-sub">Enter the access key to manage conversations, classes and payments.</p>
        </div>
        <label className="field">
          <span>Access key</span>
          <input type="password" autoComplete="current-password" value={key} onChange={(e) => setKey(e.target.value)}
            placeholder="ADMIN_TOKEN from .env" autoFocus />
        </label>
        {error && <div className="error-note" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={busy || !key.trim()}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
