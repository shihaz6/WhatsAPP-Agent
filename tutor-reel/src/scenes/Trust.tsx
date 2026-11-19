// 0:32–0:38 — A real doubt comes in. Catalyst doesn't guess: "Forwarding to Sir 👤", and the tutor gets the
// question with a summary. "Hard questions? It hands them to you."
import { useCurrentFrame } from "remotion";
import { Avatar, Bubble, C, ChatChip, DISPLAY, FONT, Mark, Phone, Typing, Words, clamp01, cues, glass, pop, prog } from "../kit";

const T = cues.trust;

export function Trust() {
  const f = useCurrentFrame();
  const phone = pop(f, 4, 15, 130);
  const n = pop(f, T.notif, 12, 170);
  const shade = prog(f, T.notif, T.notif + 10) * 0.45;
  return (
    <>
      <div style={{ position: "absolute", left: 80, right: 80, top: 190, color: C.white }}>
        <Words text="Hard questions?" start={T.head} style={{ fontFamily: DISPLAY, fontSize: 84, fontWeight: 800, letterSpacing: -4, lineHeight: 1.08 }} />
        <Words text="It hands them" start={T.head2} style={{ fontFamily: DISPLAY, fontSize: 84, fontWeight: 800, letterSpacing: -4, lineHeight: 1.08, color: C.soft }} />
        <Words text="to *you.*" start={T.head2 + 6} style={{ fontFamily: DISPLAY, fontSize: 110, fontWeight: 900, letterSpacing: -5, lineHeight: 1.08 }} />
      </div>

      <div style={{ position: "absolute", left: 170, top: 640, transform: `translateY(${(1 - phone) * 600}px)`, filter: `brightness(${1 - shade})` }}>
        <Phone width={740} height={1300} title="Ruwan · Kavindu's Thaththa" subtitle="online" avatar={<Avatar label="R" size={66} bg="#4A4A4A" />} clock="9:12">
          <Bubble side="them" time="9:12 PM" fs={31} p={pop(f, T.ask, 14, 220)}>Sir, Kavindu failed the term test 😟 Can he still move to the Grade 11 group?</Bubble>
          {f >= T.type && f < T.reply && <Typing frame={f} p={pop(f, T.type, 14, 220)} />}
          {f >= T.reply && <Bubble side="me" time="9:12 PM" ai fs={31} p={pop(f, T.reply, 13, 220)}>That's one for Sir to decide. I've sent him your message, he'll reply to you soon 🙏</Bubble>}
          {f >= T.fwd && <ChatChip tone="orange" p={pop(f, T.fwd, 12, 240)}>Forwarding to Sir 👤</ChatChip>}
        </Phone>
      </div>

      {/* the tutor's notification */}
      {f >= T.notif && (
        <div style={{
          position: "absolute", left: 60, right: 60, top: 620, ...glass, borderRadius: 40, padding: "28px 32px", border: "2px solid rgba(255,138,76,0.55)",
          boxShadow: "0 60px 120px -30px rgba(0,0,0,0.95), 0 0 80px -20px rgba(255,138,76,0.45)",
          opacity: clamp01(n * 2), transform: `translateY(${(1 - n) * -320}px) scale(${0.94 + 0.06 * Math.min(1, n)})`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT }}>
            <Mark size={58} />
            <span style={{ fontSize: 30, fontWeight: 800, color: C.white }}>Catalyst</span>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: C.char, background: C.orange, padding: "5px 14px", borderRadius: 10 }}>NEEDS YOU</span>
            <span style={{ marginLeft: "auto", fontSize: 24, fontWeight: 700, color: C.mute }}>now</span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, color: C.white, lineHeight: 1.35, marginTop: 18 }}>
            Ruwan asks if Kavindu can join <span style={{ color: C.orange }}>Grade 11</span> after failing the term test.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 22 }}>
            <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: C.char, background: C.orange, padding: "14px 26px", borderRadius: 18 }}>Open chat</div>
            <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: C.soft, background: "rgba(255,255,255,0.06)", padding: "14px 26px", borderRadius: 18 }}>Full chat attached</div>
          </div>
        </div>
      )}
    </>
  );
}
