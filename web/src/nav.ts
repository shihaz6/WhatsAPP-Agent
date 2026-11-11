// Hash routing: #/conversations/94771234567 -> { view: "conversations", arg: "94771234567" }.

export type View = "overview" | "conversations" | "classes" | "payments";
export const VIEWS: View[] = ["overview", "conversations", "classes", "payments"];

export function readHash(): { view: View; arg?: string } {
  const [view, arg] = location.hash.replace(/^#\/?/, "").split("/");
  return VIEWS.includes(view as View) ? { view: view as View, arg: arg || undefined } : { view: "overview" };
}

export const href = (view: View, arg?: string) => `#/${view}${arg ? `/${arg}` : ""}`;
export const go = (view: View, arg?: string) => { location.hash = href(view, arg).slice(1); };
