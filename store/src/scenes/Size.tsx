// 0:15–0:25. "Size 42 thiyenawada?" New stock: available. Old stock: staff will confirm (his main worry).
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { Bubble, C, Caption, Chat, Dots, FONT, Tag, clamp01, cues, lerp, pop, prog } from "../kit";

const Z = cues.size;

function Badge({ children, hot }: { children: ReactNode; hot?: boolean }) {
  return (
    <div style={{
      position: "absolute", right: 34, top: 30, zIndex: 3, fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: 2,
      padding: "10px 22px", borderRadius: 999, background: hot ? C.orange : C.white, color: C.char,
    }}>{children}</div>
  );
}

export function Size() {
  const f = useCurrentFrame();
  const a = pop(f, Z.a + 4, 16, 120);
  const b = pop(f, Z.b, 16, 120);
  const dimA = prog(f, Z.b, Z.b + 12);
  return (
    <>
      <Caption eyebrow="Size checks" text="Old stock? *It never guesses.*" />

      <div style={{ position: "absolute", left: 70, top: 420, opacity: clamp01(a * 1.4) * lerp(1, 0.75, dimA), transform: `translateY(${(1 - a) * 200}px) scale(${lerp(1, 0.97, dimA)})` }}>
        <Badge hot>NEW STOCK</Badge>
        <Chat bezel={false} composer={false} height={620}>
          <Bubble side="them" time="5:02 PM" p={pop(f, Z.askA, 14, 200)}>Black sports shoe, size 42 thiyenawada?</Bubble>
          <Dots f={f} from={Z.typA} to={Z.replyA} />
          {f >= Z.replyA && <Bubble side="me" ai time="5:02 PM" p={pop(f, Z.replyA, 13, 190)}>Ow! Size 42 <b>thiyenawa</b> ✅ Aluth stock eke.</Bubble>}
        </Chat>
      </div>

      <div style={{ position: "absolute", left: 70, top: 1080, opacity: clamp01(b * 1.4), transform: `translateY(${(1 - b) * 200}px)` }}>
        <Badge>OLD STOCK</Badge>
        <Chat bezel={false} composer={false} height={660} glow={0.4 * prog(f, Z.replyB, Z.replyB + 10)}>
          <Bubble side="them" time="5:05 PM" p={pop(f, Z.askB, 14, 200)}>Brown leather sandal, size 42 thiyenawada?</Bubble>
          <Dots f={f} from={Z.typB} to={Z.replyB} />
          {f >= Z.replyB && (
            <Bubble side="me" ai time="5:05 PM" p={pop(f, Z.replyB, 13, 190)}>
              Me item eka parana stock eke 🙏 Size eka <b>staff check karala confirm karanawa.</b>
            </Bubble>
          )}
        </Chat>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -40, display: "flex", justifyContent: "center", zIndex: 4 }}>
          {f >= Z.staff && <Tag dark p={pop(f, Z.staff, 13, 180)}>→ Sent to staff to confirm</Tag>}
        </div>
      </div>
    </>
  );
}
