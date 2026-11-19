// 0:40–0:48. An item that isn't on the list: no invented price, it goes to staff.
import { useCurrentFrame } from "remotion";
import { Bubble, Caption, Chat, Dots, Tag, cues, pop } from "../kit";

const U = cues.unknown;

export function Unknown() {
  const f = useCurrentFrame();
  return (
    <>
      <Caption eyebrow="Not on your list" text="No made-up prices. *Staff take over.*" />
      <div style={{ position: "absolute", left: 70, top: 440 }}>
        <Chat height={1310} clock="10:12" subtitle="● Catalyst is replying">
          <Bubble side="them" time="10:12 AM" p={pop(f, U.ask, 14, 200)} fs={42}>Rice cooker ekak thiyenawada? Price eka?</Bubble>
          <Dots f={f} from={U.typing} to={U.reply} />
          {f >= U.reply && (
            <Bubble side="me" ai time="10:12 AM" p={pop(f, U.reply, 13, 190)} fs={42}>
              Sorry, rice cooker <b>mage list eke na</b> 🙏 Mama staff ta kiyannam, eyala ikmanata reply karai.
            </Bubble>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10, height: f >= U.staff ? undefined : 0 }}>
            {f >= U.staff && <Tag p={pop(f, U.staff, 13, 180)}>→ Passed to your staff</Tag>}
          </div>
        </Chat>
      </div>
    </>
  );
}
