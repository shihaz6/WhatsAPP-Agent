import { useCurrentFrame } from "remotion";
import { AppWindow, Caption, Cursor, progress } from "../kit";
import { ChatScreen, type Bubble } from "./ChatScreen";
import { WINDOW, toVideo } from "./layout";

// Positions in app coordinates (checked against rendered stills).
export const POS = {
  newChat: { x: 450, y: 228 },
  takeOver: { x: 1252, y: 61 },
  composer: { x: 1000, y: 795 },
  send: { x: 1361, y: 795 },
  rest: { x: 1060, y: 470 },
};

const pop = (frame: number, at: number) => {
  const p = progress(frame, at, at + 14);
  return { opacity: p, transform: `translateY(${(1 - p) * 14}px) scale(${0.97 + 0.03 * p})`, transformOrigin: "bottom" };
};

export const Q1 = "Hi, Grade 10 maths class eka kawadada?";
export const A1 = (
  <><strong>Grade 10 Maths – Theory</strong> class eka <strong>Tuesday 4.00 pm</strong> ta thiyenawa. Next class <strong>17 Nov</strong>, Room 3, Apex Institute.
    {"\n"}Fees masekata <strong>LKR 2,000</strong>.{"\n\n"}Thawa visthara ona nam kiyanna.</>
);
export const Q2 = "Trial class ekak ganna puluwanda? Sir ekka kathakaranna one.";

export function ChatScene() {
  const frame = useCurrentFrame();
  const v = (p: { x: number; y: number }) => toVideo(p.x, p.y);

  const arrive = progress(frame, 34, 54);
  const clickAt = 92;
  const selected = frame >= clickAt + 4;
  const q1At = clickAt + 8;
  const typingOn = progress(frame, 118, 128) * (1 - progress(frame, 170, 176));
  const a1At = 174;
  const detect = progress(frame, 150, 162) * (1 - progress(frame, 200, 230));
  const q2At = 248;

  const bubbles: Bubble[] = [];
  if (selected) bubbles.push({ id: "q1", dir: "in", text: Q1, time: "16:02", style: pop(frame, q1At) });
  if (frame >= a1At) bubbles.push({ id: "a1", dir: "out", text: A1, time: "16:02", style: pop(frame, a1At) });
  if (frame >= q2At) bubbles.push({ id: "q2", dir: "in", text: Q2, time: "16:03", style: pop(frame, q2At) });

  return (
    <>
      <Caption step="02  Conversations" title="Replies in their own language"
        body="English, Sinhala and Tamil, plus Singlish and Tanglish typed in English letters." />
      <AppWindow {...WINDOW}>
        <ChatScreen
          newItem={{ p: arrive, last: frame >= q2At ? Q2 : Q1, ago: "now", unread: !selected, lang: "singlish", label: "Singlish" }}
          selected={selected}
          bubbles={bubbles}
          typing={typingOn}
          language={frame >= 156 ? "Singlish" : "English"}
          langPulse={detect}
        />
      </AppWindow>
      <Cursor appear={60} clicks={[clickAt]} keys={[
        { f: 60, ...v({ x: 900, y: 560 }) },
        { f: 88, ...v(POS.newChat) },
        { f: 120, ...v(POS.newChat) },
        { f: 160, ...v(POS.rest) },
      ]} />
    </>
  );
}

export const TEACHER = "Hello, Mr. Nuwan kathakaranne. Kasun ta Tuesday 4 ta trial class ekata enna puluwan.";

export function TakeoverScene() {
  const frame = useCurrentFrame();
  const v = (p: { x: number; y: number }) => toVideo(p.x, p.y);
  const clickTake = 34;
  const paused = frame >= clickTake + 4;
  const clickBox = 66;
  const typeFrom = 74, typeTo = 136;
  const chars = Math.round(TEACHER.length * progress(frame, typeFrom, typeTo, (t) => t));
  const clickSend = 150;
  const sent = frame >= clickSend + 4;
  const thanksAt = 176;

  const bubbles: Bubble[] = [
    { id: "q1", dir: "in", text: Q1, time: "16:02" },
    { id: "a1", dir: "out", text: A1, time: "16:02" },
    { id: "q2", dir: "in", text: Q2, time: "16:03" },
  ];
  if (sent) bubbles.push({ id: "t1", dir: "out", text: TEACHER, time: "16:04", by: "You · Teacher", style: pop(frame, clickSend + 4) });
  if (frame >= thanksAt) bubbles.push({ id: "q3", dir: "in", text: "Sthuthi sir!", time: "16:04", style: pop(frame, thanksAt) });

  return (
    <>
      <Caption step="03  Hand-off" title="Step in at any time"
        body="Take over a chat and reply as the teacher. The bot waits until you hand it back." />
      <AppWindow {...WINDOW}>
        <ChatScreen
          newItem={{ p: 1, last: sent ? TEACHER : Q2, ago: "now", unread: false, lang: "singlish", label: "Singlish" }}
          selected
          bubbles={bubbles}
          language="Singlish"
          paused={paused}
          pausedP={progress(frame, clickTake + 4, clickTake + 18)}
          draft={sent ? "" : TEACHER.slice(0, chars)}
          composerFocus={frame >= clickBox && !sent}
        />
      </AppWindow>
      <Cursor appear={4} clicks={[clickTake, clickBox, clickSend]} keys={[
        { f: 4, ...v(POS.rest) },
        { f: 30, ...v(POS.takeOver) },
        { f: 44, ...v(POS.takeOver) },
        { f: 62, ...v(POS.composer) },
        { f: 120, ...v(POS.composer) },
        { f: 146, ...v(POS.send) },
        { f: 170, ...v(POS.send) },
        { f: 196, ...v({ x: 1150, y: 600 }) },
      ]} />
    </>
  );
}
