// 0:25–0:33. A budget question; Catalyst suggests three items under it.
import { useCurrentFrame } from "remotion";
import { Bubble, C, Caption, Chat, Dots, FONT, clamp01, cues, pop, prog } from "../kit";

const B = cues.budget;

const ITEMS: [string, string][] = [
  ["Kids' Cotton T-Shirt", "1,450"],
  ["Canvas Tote Bag", "1,790"],
  ["Men's Leather Belt", "1,950"],
];

export function Budget() {
  const f = useCurrentFrame();
  return (
    <>
      <Caption eyebrow="Budget shoppers" text="Has a budget? *Gets 3 picks.*" />
      <div style={{ position: "absolute", left: 70, top: 440 }}>
        <Chat height={1310} clock="6:15" subtitle="● Catalyst is replying">
          <Bubble side="them" time="6:15 PM" p={pop(f, B.ask, 14, 200)} fs={42}>Rs. 2000 budget, mokakda thiyenne?</Bubble>
          <Dots f={f} from={B.typing} to={B.reply} />
          {f >= B.reply && (
            <Bubble side="me" ai time="6:15 PM" p={pop(f, B.reply, 13, 190)} fs={40}>
              <div>Rs. 2,000 ta athule meyawa thiyenawa 👇</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "16px 0 6px" }}>
                {ITEMS.map(([name, price], i) => {
                  const p = prog(f, B.reply + 10 + i * 9, B.reply + 22 + i * 9);
                  return (
                    <div key={name} style={{
                      display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderRadius: 18, background: "rgba(255,255,255,0.42)",
                      fontFamily: FONT, opacity: clamp01(p * 1.3), transform: `translateX(${(1 - p) * 40}px)`,
                    }}>
                      <span style={{ width: 46, height: 46, borderRadius: 46, background: C.char, color: C.orange, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 36, fontWeight: 700 }}>{name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 36, fontWeight: 800, whiteSpace: "nowrap" }}>Rs. {price}</span>
                    </div>
                  );
                })}
              </div>
            </Bubble>
          )}
        </Chat>
      </div>
    </>
  );
}
