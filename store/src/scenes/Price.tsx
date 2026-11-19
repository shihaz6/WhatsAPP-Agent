// 0:05–0:15. "Shoe eka price eka kiyada?" and Catalyst answers with the price from the item list.
import { useCurrentFrame } from "remotion";
import { Bubble, Caption, Chat, Dots, Tag, clamp01, cues, pop } from "../kit";

const P = cues.price;

export function Price() {
  const f = useCurrentFrame();
  const phone = pop(f, P.phone, 16, 110);
  return (
    <>
      <Caption eyebrow="Price questions" text="Asks the price. *Gets it instantly.*" />
      <div style={{ position: "absolute", left: 70, top: 440, opacity: clamp01(phone * 1.4), transform: `translateY(${(1 - phone) * 260}px)` }}>
        <Chat height={1310} clock="4:20" subtitle="● Catalyst is replying">
          <Bubble side="them" time="4:20 PM" p={pop(f, P.ask, 14, 200)} fs={42}>Shoe eka price eka kiyada? 👟</Bubble>
          <Dots f={f} from={P.typing} to={P.reply} />
          {f >= P.reply && (
            <Bubble side="me" ai time="4:20 PM" p={pop(f, P.reply, 13, 190)} fs={42}>
              Men's Black Sports Shoe eka <b style={{ whiteSpace: "nowrap" }}>Rs. 6,950</b> 😊<br />Sizes 39 – 44 thiyenawa.
            </Bubble>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10, height: f >= P.chip ? undefined : 0 }}>
            {f >= P.chip && <Tag p={pop(f, P.chip, 13, 180)}>✓ Price from your item list</Tag>}
          </div>
        </Chat>
      </div>
    </>
  );
}
