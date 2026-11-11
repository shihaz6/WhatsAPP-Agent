// AI agent tests (bot/agent.js, bot/tools.js) with a scripted fake LLM. Run: npm test
// These check the loop, tools, scoping and fallbacks, not the model's wording.

process.env.DB_PATH = ":memory:";

const { test, beforeEach, describe } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");
const { seed } = require("../db/seed");
const { createAgent, systemPrompt, toWhatsApp, FALLBACK, FALLBACKS } = require("../bot/agent");
const { createTools } = require("../bot/tools");

const NOW = new Date("2026-11-10T06:00:00Z"); // Tue 10 Nov 2026, 11:30 in Colombo
const PERERA = "94770000202";   // parent: Dilini (A/L) + Kasun (Grade 10)
const FERNANDO = "94770000201"; // parent: Sahan, enrolled in online paper class 3
const quietLog = { log() {}, warn() {}, error() {} };

// Fake LLM: each call returns the next scripted step and records the request.
// A step is a string (final answer), { tools: [[name, args], ...] }, or a function of the request.
function scriptedLLM(steps) {
  const llm = { requests: [] };
  llm.chat = async (req) => {
    llm.requests.push(structuredClone(req));
    let step = steps[llm.requests.length - 1];
    if (typeof step === "function") step = step(req);
    if (step instanceof Error) throw step;
    if (step === undefined) throw new Error("script ran out");
    if (typeof step === "string") return { message: { role: "assistant", content: step } };
    return {
      message: {
        role: "assistant", content: null,
        tool_calls: step.tools.map(([name, args], i) => ({
          id: `call_${llm.requests.length}_${i}`, type: "function",
          function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args ?? {}) },
        })),
      },
    };
  };
  return llm;
}

const contact = (waId) => db.ensureContact(waId);
let seq = 0;
function incoming(waId, text) {
  const id = `wamid.t.${++seq}`;
  db.logMessage({ id, waId, direction: "in", type: "text", body: text }); // the handler logs before the agent runs
  return { id, from: waId, type: "text", text };
}
const toolResults = (req) => req.messages.filter((m) => m.role === "tool").map((m) => JSON.parse(m.content));
const agentWith = (llm, opts = {}) => createAgent({ db, llm, log: quietLog, clock: () => NOW, ...opts });

beforeEach(() => seed({ now: NOW }));

describe("agent loop", () => {
  test("a direct answer becomes one WhatsApp text reply", async () => {
    const llm = scriptedLLM(["Hello! How can I help?"]);
    const r = await agentWith(llm).respond({ contact: contact(PERERA), incoming: incoming(PERERA, "hi") });
    assert.deepEqual(r.replies, [{ type: "text", body: "Hello! How can I help?" }]);
    assert.equal(llm.requests.length, 1);
    assert.equal(llm.requests[0].tools.length, createTools({ db, contact: contact(PERERA) }).names.length);
  });

  test("tool call -> result goes back to the model -> final answer", async () => {
    const llm = scriptedLLM([{ tools: [["list_classes", {}]] }, "We have 7 classes."]);
    const r = await agentWith(llm).respond({ contact: contact(PERERA), incoming: incoming(PERERA, "what classes?") });
    assert.equal(r.replies[0].body, "We have 7 classes.");
    assert.deepEqual(r.toolCalls, ["list_classes"]);
    const [classes] = toolResults(llm.requests[1]);
    assert.equal(classes.length, 7);
    assert.ok(classes.find((c) => c.class_id === 7).full);
  });

  test("several tool calls in one round", async () => {
    const llm = scriptedLLM([{ tools: [["get_my_family"], ["get_my_fees"]] }, "Done."]);
    const r = await agentWith(llm).respond({ contact: contact(PERERA), incoming: incoming(PERERA, "summary please") });
    assert.deepEqual(r.toolCalls, ["get_my_family", "get_my_fees"]);
    assert.equal(toolResults(llm.requests[1]).length, 2);
  });

  test("unknown tools and bad arguments go back to the model as errors, and the loop continues", async () => {
    const llm = scriptedLLM([{ tools: [["delete_everything", {}], ["get_class_schedule", "{not json"]] }, "Sorry about that."]);
    const r = await agentWith(llm).respond({ contact: contact(PERERA), incoming: incoming(PERERA, "x") });
    assert.equal(r.replies[0].body, "Sorry about that.");
    const [a, b] = toolResults(llm.requests[1]);
    assert.match(a.error, /Unknown tool/);
    assert.match(b.error, /JSON object/);
  });

  test("an endless tool loop stops at the round limit with the fallback", async () => {
    const llm = scriptedLLM(Array(10).fill({ tools: [["list_classes", {}]] }));
    const r = await agentWith(llm, { maxRounds: 3 }).respond({ contact: contact(FERNANDO), incoming: incoming(FERNANDO, "x") });
    assert.equal(r.replies[0].body, FALLBACK);
    assert.equal(r.failed, true);
    assert.equal(llm.requests.length, 3);
  });

  test("an LLM error (e.g. Groq down or rate limited) gives the fallback", async () => {
    const llm = scriptedLLM([new Error("Groq API 429: rate limit")]);
    const r = await agentWith(llm).respond({ contact: contact(FERNANDO), incoming: incoming(FERNANDO, "x") });
    assert.equal(r.replies[0].body, FALLBACK);
    assert.equal(r.failed, true);
  });

  test("an empty answer gives the fallback", async () => {
    const r = await agentWith(scriptedLLM(["   "])).respond({ contact: contact(FERNANDO), incoming: incoming(FERNANDO, "x") });
    assert.equal(r.replies[0].body, FALLBACK);
  });
});

describe("context sent to the model", () => {
  test("system prompt has today's date, the contact and their students", () => {
    const c = contact(PERERA);
    const p = systemPrompt({ tutor: db.getTutor(), contact: c, students: db.listStudents(c.id), now: NOW, db });
    assert.match(p, /Tuesday, 10 November 2026/);
    assert.match(p, /Mrs\. S\. Perera, a parent/);
    const dilini = p.split("\n").find((l) => l.startsWith("- Dilini Perera (A/L 2027): "));
    assert.ok(dilini?.includes("2027 A/L Physics – Theory [active]"));
    assert.ok(dilini.includes("A/L Physics – Paper Class [pending]"));
    assert.match(p, /- Kasun Perera \(Grade 10\): Grade 10 Maths – Theory \[active\]/);
    assert.match(p, /NOT the tutor/);
  });

  test("a new number is described as a new enquiry", () => {
    const c = contact("94779990001");
    assert.match(systemPrompt({ tutor: db.getTutor(), contact: c, students: [], now: NOW }), /new enquiry/);
  });

  test("chat history is sent in order, with roles, ending with the new message", async () => {
    db.logMessage({ id: "h1", waId: PERERA, direction: "in", type: "text", body: "hi" });
    db.logMessage({ id: "h2", waId: PERERA, direction: "out", type: "text", body: "Hello!" });
    db.logMessage({ id: "h3", waId: PERERA, direction: "in", type: "image", body: null });
    const llm = scriptedLLM(["ok"]);
    await agentWith(llm).respond({ contact: contact(PERERA), incoming: incoming(PERERA, "fees?") });
    const convo = llm.requests[0].messages.slice(1, -1).map((m) => [m.role, m.content]);
    assert.deepEqual(convo, [["user", "hi"], ["assistant", "Hello!"], ["user", "[sent a photo]"], ["user", "fees?"]]);
  });

  test("history is capped", async () => {
    for (let i = 0; i < 30; i++) db.logMessage({ id: `old${i}`, waId: PERERA, direction: "in", type: "text", body: `m${i}` });
    const llm = scriptedLLM(["ok"]);
    await agentWith(llm, { historyLimit: 5 }).respond({ contact: contact(PERERA), incoming: incoming(PERERA, "latest") });
    assert.equal(llm.requests[0].messages.length, 1 + 5 + 1);
    assert.equal(llm.requests[0].messages.at(-2).content, "latest");
  });
});

describe("tools are scoped to the contact", () => {
  const run = (waId, name, args = {}) => createTools({ db, contact: contact(waId), now: NOW }).run(name, JSON.stringify(args));

  test("get_my_family returns only this contact's students", () => {
    assert.deepEqual(run(PERERA, "get_my_family").students.map((s) => s.name), ["Dilini Perera", "Kasun Perera"]);
    assert.deepEqual(run(FERNANDO, "get_my_family").students.map((s) => s.name), ["Sahan Fernando"]);
    assert.deepEqual(run("94779990001", "get_my_family").students, []);
  });

  test("tools take no contact/student id, and extra arguments can't widen the scope", () => {
    const fees = run(PERERA, "get_my_fees", { contact_id: 1, wa_id: FERNANDO, student_id: 1 });
    const names = new Set(fees.payments.map((p) => p.student));
    assert.deepEqual([...names].sort(), ["Dilini Perera", "Kasun Perera"]);
    for (const def of createTools({ db, contact: contact(PERERA) }).definitions) {
      const props = Object.keys(def.function.parameters.properties);
      assert.ok(!props.some((p) => /contact|student|wa_id|phone/.test(p)), `${def.function.name} takes ${props}`);
    }
  });

  test("get_my_fees shows statuses, rejection reasons and the total owed", () => {
    const fees = run("94770000204", "get_my_fees");
    const rejected = fees.payments.find((p) => p.status === "rejected");
    assert.match(rejected.rejection_reason, /2,000/);
    assert.equal(fees.total_owed, "LKR 9,000"); // Nov revision 4,000 + Nov paper 2,500 + rejected Oct paper 2,500
  });

  test("Zoom links only for students enrolled in that class", () => {
    const cls = (waId) => run(waId, "list_classes").find((c) => c.class_id === 3);
    assert.match(cls(FERNANDO).where, /zoom\.example\.com/);
    assert.doesNotMatch(cls(PERERA).where, /zoom/);
    assert.doesNotMatch(cls("94779990001").where, /zoom/);
    const sahan = run(FERNANDO, "get_my_family").students[0].classes.find((c) => c.class_id === 3);
    assert.match(sahan.where, /zoom/);
  });

  test("get_class_schedule shows the Nov 14 cancellation and the move to Friday", () => {
    const s = run(PERERA, "get_class_schedule", { class_ids: [1, 3], days: 7 });
    assert.deepEqual(s.map((x) => `${x.date} ${x.day} ${x.time} ${x.status}`), [
      "2026-11-13 Friday 19:00 rescheduled",
      "2026-11-14 Saturday 08:00 cancelled",
    ]);
    assert.equal(s[0].moved_from, "2026-11-11");
    assert.match(s[1].note, /Hall unavailable/);
  });

  test("list_classes carries the next sessions, so 'this Saturday' can't miss the cancellation", () => {
    const classes = run(PERERA, "list_classes");
    const cm = classes.find((c) => c.class_id === 1);
    assert.equal(cm.weekly, "Saturday 08:00");
    assert.deepEqual(cm.next_sessions.map((s) => `${s.date} ${s.status}`), ["2026-11-14 cancelled", "2026-11-21 scheduled"]);
    assert.match(cm.next_sessions[0].note, /Hall unavailable/);
    const paper = classes.find((c) => c.class_id === 3);
    assert.deepEqual(paper.next_sessions.map((s) => `${s.date} ${s.day} ${s.time} ${s.status}`),
      ["2026-11-13 Friday 19:00 rescheduled", "2026-11-18 Wednesday 18:00 scheduled"]);
  });

  test("other read tools", () => {
    assert.equal(run(PERERA, "get_tutor_info").name, "Mr. Nuwan Jayasekara");
    assert.equal(run(PERERA, "get_faqs").length, 8);
    assert.equal(run(PERERA, "get_one_to_one_info").rates[0].hourly_rate.startsWith("LKR"), true);
    const perera = run(PERERA, "get_my_materials");
    assert.ok(perera.materials.some((m) => m.title.includes("Algebra")), "Kasun's Grade 10 material");
    assert.ok(perera.active_classes.includes("Grade 10 Maths – Theory"));
    const stranger = run("94779990001", "get_my_materials");
    assert.ok(!stranger.materials.some((m) => m.class !== "All students"));
    assert.deepEqual(stranger.active_classes, []);
    assert.match(stranger.note, /only with students actively enrolled/);
  });
});

describe("language", () => {
  const RIZWAN = "94770000105"; // seeded with language "ta"
  const lang = (waId) => db.getContactByWaId(waId).language;

  test("the language they write in is saved on the contact and named in the prompt", async () => {
    for (const [text, expected] of [
      ["Grade 10 maths class eka kawadada?", "singlish"],
      ["class eppo start aagum?", "tanglish"],
      ["ගාස්තුව කීයද?", "si"],
      ["வகுப்பு எப்போது?", "ta"],
      ["What time is the class on Saturday?", "en"],
    ]) {
      const llm = scriptedLLM(["ok"]);
      await agentWith(llm).respond({ contact: contact(FERNANDO), incoming: incoming(FERNANDO, text) });
      assert.equal(lang(FERNANDO), expected, text);
      assert.match(llm.requests[0].messages[0].content, new RegExp(`usual language: ${expected === "en" ? "English" : ""}`));
    }
  });

  test("every request ends with a reminder of the reply language, after the user's message", async () => {
    const llm = scriptedLLM([{ tools: [["list_classes", {}]] }, "ok"]);
    await agentWith(llm).respond({ contact: contact(FERNANDO), incoming: incoming(FERNANDO, "mokakda class eka") });
    const [first] = llm.requests;
    assert.equal(first.messages.at(-2).content, "mokakda class eka");
    assert.equal(first.messages.at(-1).role, "system");
    assert.match(first.messages.at(-1).content, /Reply in Singlish/);
    assert.match(first.messages.at(-1).content, /must come from a tool result/);
    // Tool rounds keep it in place (before the tool results, after the user's message).
    assert.ok(llm.requests[1].messages.some((m) => m.role === "system" && /Reply in Singlish/.test(m.content)));
  });

  test("Singlish/Tanglish phrasing notes go only to contacts who use them", () => {
    const prompt = (language) => systemPrompt({ tutor: db.getTutor(), contact: { ...contact(FERNANDO), language }, students: [], now: NOW });
    assert.match(prompt("singlish"), /"to know" is "dana ganna"/);
    assert.doesNotMatch(prompt("singlish"), /Tanglish wording/);
    assert.match(prompt("tanglish"), /Tanglish wording/);
    assert.doesNotMatch(prompt("en"), /Singlish wording|Tanglish wording/);
  });

  test("the prompt says there is no menu", () => {
    assert.match(systemPrompt({ tutor: db.getTutor(), contact: contact(FERNANDO), students: [], now: NOW }), /no menu/);
  });

  test("a message that doesn't show a language keeps the saved one", async () => {
    await agentWith(scriptedLLM(["ok"])).respond({ contact: contact(FERNANDO), incoming: incoming(FERNANDO, "fees kiyada sir?") });
    for (const text of ["ok", "thanks", "👍", "Kasun", "hari"]) {
      const llm = scriptedLLM(["ok"]);
      await agentWith(llm).respond({ contact: contact(FERNANDO), incoming: incoming(FERNANDO, text) });
      assert.equal(lang(FERNANDO), "singlish", text);
      assert.match(llm.requests[0].messages[0].content, /usual language: Singlish/);
    }
  });

  test("a photo (no text) keeps the saved language", async () => {
    const msg = { id: "wamid.photo", from: RIZWAN, type: "image", text: null };
    db.logMessage({ id: msg.id, waId: RIZWAN, direction: "in", type: "image", body: null });
    await agentWith(scriptedLLM(["ok"])).respond({ contact: contact(RIZWAN), incoming: msg });
    assert.equal(lang(RIZWAN), "ta");
  });

  test("the prompt asks to mirror language and script, with Singlish/Tanglish examples", () => {
    const p = systemPrompt({ tutor: db.getTutor(), contact: contact(RIZWAN), students: [], now: NOW });
    assert.match(p, /same language AND the same script/);
    assert.match(p, /Singlish.*never Sinhala script/);
    assert.match(p, /Tanglish.*never Tamil script/);
    assert.match(p, /usual language: Tamil \(Tamil script\)/);
  });

  test("the fallback is sent in the contact's language", async () => {
    const fail = () => scriptedLLM([new Error("Groq down")]);
    const r1 = await agentWith(fail()).respond({ contact: contact(FERNANDO), incoming: incoming(FERNANDO, "class eppo?") });
    assert.equal(r1.replies[0].body, FALLBACKS.tanglish);
    const r2 = await agentWith(fail()).respond({ contact: contact(PERERA), incoming: incoming(PERERA, "ok") });
    assert.equal(r2.replies[0].body, FALLBACKS.si, "Perera is seeded as Sinhala");
  });
});

describe("WhatsApp formatting", () => {
  test("markdown is converted", () => {
    assert.equal(toWhatsApp("## Fees\n**LKR 3,500** per month, see [timetable](https://x.example/t)"),
      "Fees\n*LKR 3,500* per month, see timetable: https://x.example/t");
    assert.equal(toWhatsApp("x".repeat(5000)).length, 4096);
  });
});
