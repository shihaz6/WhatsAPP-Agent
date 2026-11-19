// On-screen copy for both versions. Guest chats stay in the guest's own language in both.
import { createContext, useContext } from "react";

export type Lang = "en" | "si";

const EN = {
  hook: { country: "SRI LANKA", title: "*3:12 AM* in Ella.", sub: "Your guests? Wide awake." },
  problem: {
    asleep: "You're *asleep.*", busy: "Or busy with the guests already here.",
    waited: (h: number, m: string) => `No reply for ${h}h ${m}m`,
    morning1: "By morning, they've", morning2: "*booked elsewhere.*", lost: "LOST",
  },
  turn: { audience: "HOTELS · VILLAS · TOURS", meet1: "Meet your *24/7* WhatsApp", meet2: "front desk." },
  answer: {
    h1: "Instant answers.", h2: "*From your own rates.*", sheet: "Your rate sheet",
    note: "Catalyst replies using your rate sheet", sent: "✓ Booking request sent to the owner", fast: "Answered at 3:12 AM, not 7:30",
  },
  langs: { h1: "Speaks your", h2: "*guests' language.*" },
  wake: {
    a1: "*7:00 AM.* Wake up to", a2: "bookings, not a backlog.", b1: "You approve every deposit.", b2: "Not sure? *It asks you.*",
    notOnSheet: "Not on your sheet, so it asked you", needs: "Needs you", takeover: "Take over any chat, any time",
  },
  close: { sleep: "Sleep *easy.*", tag1: "Your WhatsApp front desk,", tag2: "*open 24 hours.*", audience: "HOTELS · VILLAS · TOURS · SAFARIS" },
};

const SI: typeof EN = {
  hook: { country: "ශ්‍රී ලංකාව", title: "*පාන්දර 3:12*, ඇල්ලේ.", sub: "ඔබේ අමුත්තෝ නම් අවදියි." },
  problem: {
    asleep: "ඔබ *නින්දේ.*", busy: "නැත්නම් ඉන්න අමුත්තන් එක්ක වැඩ.",
    waited: (h: number, m: string) => `පැය ${h}යි විනාඩි ${m}ක් reply නෑ`,
    morning1: "උදේ වෙනකොට,", morning2: "*වෙන තැනක book කරලා.*", lost: "අහිමියි",
  },
  turn: { audience: "හෝටල් · විලා · ටුවර්ස්", meet1: "ඔබේ *24/7* WhatsApp", meet2: "front desk එක මෙන්න." },
  answer: {
    h1: "ක්ෂණික උත්තර.", h2: "*ඔබේම මිල ගණන් වලින්.*", sheet: "ඔබේ මිල ලැයිස්තුව",
    note: "ඔබේ මිල ලැයිස්තුවෙන්ම Catalyst උත්තර දෙනවා", sent: "✓ Booking request එක අයිතිකරුට යැව්වා", fast: "3:12ටම උත්තර. 7:30ට නෙවෙයි.",
  },
  langs: { h1: "අමුත්තා ලියන", h2: "*භාෂාවෙන්ම උත්තර.*" },
  wake: {
    a1: "*උදේ 7:00.* ඇහැරෙනකොට", a2: "bookings ලෑස්තියි.", b1: "හැම deposit එකක්ම approve කරන්නේ ඔබ.", b2: "දන්නේ නැත්නම්? *ඔබෙන් අහනවා.*",
    notOnSheet: "ලැයිස්තුවේ නැති නිසා ඔබෙන් ඇහුවා", needs: "ඔබ බලන්න", takeover: "ඕන chat එකක් ඕන වෙලාවක take over කරන්න",
  },
  close: { sleep: "*සැනසිල්ලේ* නිදාගන්න.", tag1: "ඔබේ WhatsApp front desk එක,", tag2: "*පැය 24ම විවෘතයි.*", audience: "හෝටල් · විලා · ටුවර්ස් · සෆාරි" },
};

export const LangCtx = createContext<Lang>("en");
export function useT() {
  const lang = useContext(LangCtx);
  return { t: lang === "si" ? SI : EN, si: lang === "si" };
}
