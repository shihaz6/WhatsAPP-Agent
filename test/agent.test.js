// AI agent tests (bot/agent.js, bot/tools.js) with a scripted fake LLM: no Groq calls. Run: npm test
// These check the loop, tools, scoping, languages and fact checks, not the model's wording.

process.env.DB_PATH = ":memory:";

const { test, beforeEach, describe } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");
const { setupInstitute, REGULAR, TAMIL, NEW_NUMBER } = require("./fixtures");
const { createAgent, systemPrompt, toWhatsApp, unsupportedFacts, falsePromises, FALLBACK, FALLBACKS } = require("../bot/agent");
const { detectLanguage } = require("../bot/language");
const { createTools } = require("../bot/tools");

const NOW = new Date("2026-11-10T06:00:00Z"); // Tue 10 Nov 2026, 11:30 in Colombo
const quietLog = { log() {}, warn() {}, error() {} };

// Fake LLM: each call returns the next scripted step and records the request.
// A step is a string (final answer), { tools: [[name, args], ...] }, an Error, or a function of the request.
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
const prompt = (c, extra = {}) => systemPrompt({
  business: db.getBusiness(), contact: c, now: NOW, db, replyLanguage: db.replyLanguageFor(c.language),
  allowedLanguages: db.listReplyLanguages().filter((l) => l.enabled).map((l) => l.code), handoverRules: db.listHandoverRules(), ...extra,
});
const run = (waId, name, args = {}) => createTools({ db, contact: contact(waId) }).run(name, JSON.stringify(args));

beforeEach(setupInstitute);

describe("agent loop", () => {
  test("a direct answer becomes one WhatsApp text reply", async () => {
    const llm = scriptedLLM(["Hello! How can I help?"]);
    const r = await agentWith(llm).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "hi") });
    assert.deepEqual(r.replies, [{ type: "text", body: "Hello! How can I help?" }]);
    assert.equal(llm.requests.length, 1);
    assert.deepEqual(llm.requests[0].tools.map((t) => t.function.name).sort(),
      ["get_business_info", "get_faqs", "hand_off_to_owner", "search_courses"]);
  });

  test("tool call -> result goes back to the model -> final answer", async () => {
    const llm = scriptedLLM([{ tools: [["search_courses", { query: "maths" }]] }, "Grade 11 Maths is LKR 3,000 a month."]);
    const r = await agentWith(llm).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "maths class fee?") });
    assert.equal(r.replies[0].body, "Grade 11 Maths is LKR 3,000 a month.");
    assert.deepEqual(r.toolLog, [{ name: "search_courses", ok: true }]);
    assert.deepEqual(toolResults(llm.requests[1])[0].courses.map((c) => c.name), ["Grade 11 Maths"]);
  });

  test("unknown tools and bad arguments go back to the model as errors, and the loop continues", async () => {
    const llm = scriptedLLM([{ tools: [["delete_everything", {}], ["search_courses", "{not json"]] }, "Sorry about that."]);
    const r = await agentWith(llm).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "x") });
    assert.equal(r.replies[0].body, "Sorry about that.");
    const [a, b] = toolResults(llm.requests[1]);
    assert.match(a.error, /Unknown tool/);
    assert.match(b.error, /JSON object/);
    assert.deepEqual(r.toolLog.map((t) => [t.name, t.ok]), [["delete_everything", false], ["search_courses", false]]);
  });

  test("an endless tool loop stops at the round limit with the fallback", async () => {
    const llm = scriptedLLM(Array(10).fill({ tools: [["get_faqs", {}]] }));
    const r = await agentWith(llm, { maxRounds: 3 }).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "x") });
    assert.equal(r.replies[0].body, FALLBACK);
    assert.equal(r.failed, true);
    assert.equal(llm.requests.length, 3);
    assert.match(r.error, /3 rounds/);
  });

  test("an LLM error (e.g. Groq down or rate limited) gives the fallback", async () => {
    const r = await agentWith(scriptedLLM([new Error("Groq API 429: rate limit")])).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "x") });
    assert.equal(r.replies[0].body, FALLBACK);
    assert.equal(r.error, "Groq API 429: rate limit");
  });

  test("an empty answer gives the fallback", async () => {
    const r = await agentWith(scriptedLLM(["   "])).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "x") });
    assert.equal(r.replies[0].body, FALLBACK);
    assert.match(r.error, /empty answer/);
  });
});

describe("context sent to the model", () => {
  test("the prompt has the date, the institute, its details and the courses on offer", () => {
    const p = prompt(contact(REGULAR));
    assert.match(p, /Tuesday, 10 November 2026/);
    assert.match(p, /assistant for Test Academy/);
    assert.match(p, /This chat: Test Parent/);
    assert.match(p, /Office hours: Mon–Sat, 8:00 AM–6:00 PM/);
    assert.match(p, /Classes and enrolment: Physical classes/);
    assert.match(p, /\*Grade 11 Maths\* · fee LKR 3,000 · 24 seats left · O\/L · Saturday 8:00 AM, Sinhala medium/);
    assert.match(p, /\*A\/L Physics Theory\* · fee LKR 3,500 · FULL/);
    assert.match(p, /\*IELTS Preparation\* · fee LKR 25,000 · IELTS/, "unlimited seats show no count");
    assert.doesNotMatch(p, /Old Hidden Item/, "hidden courses aren't offered");
    assert.match(p, /NOT the owner/);
    assert.doesNotMatch(p, /shop|product|deliver|in stock|out of stock|order/i, "no shop wording left");
  });

  test("a greeting is answered with a welcome that names the institute, not a stock line", () => {
    const p = prompt(contact(REGULAR));
    assert.match(p, /only a greeting[^\n]*Welcome to \*Test Academy\*/);
    assert.match(p, /Never use stock lines like "How can I assist you today\?"/);
  });

  test("details the owner hasn't set are marked, so the model doesn't guess them", () => {
    db.saveBusiness({ opening_hours: "" });
    assert.match(prompt(contact(REGULAR)), /Office hours: not set \(don't guess/);
  });

  test("an empty institute: the prompt says there are no courses", () => {
    db.resetSchema();
    const p = prompt(contact(NEW_NUMBER));
    assert.match(p, /hasn't listed any yet/);
    assert.match(p, /assistant for the institute/);
  });

  test("a long catalogue is cut off with a pointer to search_courses", () => {
    db.importProducts(Array.from({ length: 70 }, (_, i) => ({ name: `Item ${i}`, price: 100 + i })));
    assert.match(prompt(contact(REGULAR)), /\(14 more not shown: use search_courses\.\)/);
  });

  // Phone test, 20 Nov: "who is sakitha" and "who are the other customers you got" were both handed
  // over, pausing the bot. They should get a short answer instead.
  test("questions about other students or off-topic ones are answered, not handed over", () => {
    const p = prompt(contact(REGULAR));
    assert.match(p, /never say anything about other students.*Don't hand over for this/);
    assert.match(p, /Off-topic questions.*Don't hand over for these either/);
    assert.match(p, /Bot is unsure of the answer \(about this institute:/, "'unsure' means unsure about the institute");
    const handOff = createTools({ db, contact: contact(REGULAR) }).definitions.find((d) => d.function.name === "hand_off_to_owner");
    assert.match(handOff.function.description, /NOT for questions about other students/);
  });

  test("only the handover rules the owner left on are in the prompt", () => {
    db.saveHandoverRules([{ key: "group_enrolment", enabled: false }]);
    const p = prompt(contact(REGULAR));
    assert.match(p, /- Student or parent asks to speak to a person/);
    assert.match(p, /- Bot is unsure of the answer/);
    assert.doesNotMatch(p, /Group enrolment of 5 or more students/);
  });

  test("chat history is sent in order, with roles, ending with the new message", async () => {
    db.logMessage({ id: "h1", waId: REGULAR, direction: "in", type: "text", body: "hi" });
    db.logMessage({ id: "h2", waId: REGULAR, direction: "out", type: "text", body: "Hello!" });
    db.logMessage({ id: "h3", waId: REGULAR, direction: "in", type: "image", body: null });
    const llm = scriptedLLM(["ok"]);
    await agentWith(llm).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "price?") });
    const convo = llm.requests[0].messages.slice(1, -1).map((m) => [m.role, m.content]);
    assert.deepEqual(convo, [["user", "hi"], ["assistant", "Hello!"], ["user", "[sent a photo]"], ["user", "price?"]]);
  });

  test("replies that never reached the customer are left out of the history", async () => {
    db.logMessage({ id: "h1", waId: REGULAR, direction: "in", type: "text", body: "hi" });
    db.logMessage({ id: "h2", waId: REGULAR, direction: "out", type: "text", body: "lost", status: "failed", error: "boom" });
    db.logMessage({ id: "h3", waId: REGULAR, direction: "out", type: "text", body: "unsent", status: "not_sent" });
    db.logMessage({ id: "h4", waId: REGULAR, direction: "out", type: "text", body: "Hello!", status: "sent" });
    const llm = scriptedLLM(["ok"]);
    await agentWith(llm).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "price?") });
    assert.deepEqual(llm.requests[0].messages.slice(1, -1).map((m) => m.content), ["hi", "Hello!", "price?"]);
  });

  test("history before HISTORY_SINCE (an earlier version of the bot) is left out", async () => {
    db.logMessage({ id: "old1", waId: REGULAR, direction: "out", type: "text", body: "Your class is on Saturday" });
    const llm = scriptedLLM(["ok"]);
    await agentWith(llm, { historySince: "2999-01-01T00:00:00Z" }).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "hello") });
    assert.deepEqual(llm.requests[0].messages.slice(1, -1).map((m) => m.content), ["hello"]);
  });

  test("history is capped", async () => {
    for (let i = 0; i < 30; i++) db.logMessage({ id: `old${i}`, waId: REGULAR, direction: "in", type: "text", body: `m${i}` });
    const llm = scriptedLLM(["ok"]);
    await agentWith(llm, { historyLimit: 5 }).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "latest") });
    assert.equal(llm.requests[0].messages.length, 1 + 5 + 1);
    assert.equal(llm.requests[0].messages.at(-2).content, "latest");
  });
});

describe("tools", () => {
  test("search_courses: fees with the currency, seats, details; hidden courses never", () => {
    const { courses } = run(REGULAR, "search_courses", { query: "o/l" });
    assert.deepEqual(courses, [{ name: "Grade 11 Maths", fee: "LKR 3,000", seats: "24 seats left", subject_or_grade: "O/L", details: "Saturday 8:00 AM, Sinhala medium" }]);
    assert.equal(run(REGULAR, "search_courses", { query: "physics" }).courses[0].seats, "full (no seats left)");
    assert.equal(run(REGULAR, "search_courses", { query: "ielts" }).courses[0].seats, "open");
    assert.equal(run(REGULAR, "search_courses").courses.length, 4);
  });

  test("search_courses: nothing found, or nothing listed, says what to do instead of guessing", () => {
    assert.match(run(REGULAR, "search_courses", { query: "piano" }).note, /doesn't list it/);
    db.resetSchema();
    assert.match(run(REGULAR, "search_courses", { query: "maths" }).note, /hasn't listed any courses/);
  });

  test("get_business_info, with a note about anything the owner left empty", () => {
    const info = run(REGULAR, "get_business_info");
    assert.equal(info.name, "Test Academy");
    assert.match(info.paying_fees, /TEST BANK/);
    assert.equal(info.note, undefined);
    db.saveBusiness({ location: "", opening_hours: "" });
    assert.match(run(REGULAR, "get_business_info").note, /Not set by the owner: office hours, location/);
  });

  test("get_faqs", () => {
    assert.equal(run(REGULAR, "get_faqs").length, 2);
    for (const f of db.listFaqs()) db.deleteFaq(f.id);
    assert.match(run(REGULAR, "get_faqs").note, /hasn't added any FAQs/);
  });

  test("hand_off_to_owner pauses only this chat, with the summary for the owner; it needs a summary", () => {
    assert.match(run(REGULAR, "hand_off_to_owner", {}).error, /summary is required/);
    assert.equal(contact(REGULAR).bot_paused, 0);
    assert.equal(run(REGULAR, "hand_off_to_owner", { summary: "Wants to enrol Kasun (Grade 11) in Grade 11 Maths, Saturday batch" }).ok, true);
    const c = contact(REGULAR);
    assert.equal(c.bot_paused, 1);
    assert.equal(c.paused_reason, "Handed over by the bot:\nWants to enrol Kasun (Grade 11) in Grade 11 Maths, Saturday batch");
    assert.equal(contact(TAMIL).bot_paused, 0);
  });

  test("no tool takes a contact or phone number, so the model can't act for another chat", () => {
    for (const def of createTools({ db, contact: contact(REGULAR) }).definitions) {
      const props = Object.keys(def.function.parameters.properties);
      assert.ok(!props.some((p) => /contact|wa_id|phone|number/.test(p)), `${def.function.name} takes ${props}`);
      assert.equal(def.function.parameters.additionalProperties, false);
    }
  });

  test("the agent reports a successful handover, so the owner can be told", async () => {
    const llm = scriptedLLM([{ tools: [["hand_off_to_owner", { summary: "Wants to enrol" }]] }, "The office has your message and will reply here."]);
    const r = await agentWith(llm).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "I want to join") });
    assert.equal(r.handedOff, true);
    assert.equal(r.replies[0].body, "The office has your message and will reply here.");
    const plain = await agentWith(scriptedLLM(["Hi!"])).respond({ contact: contact(TAMIL), incoming: incoming(TAMIL, "hi") });
    assert.equal(plain.handedOff, false);
  });
});

describe("language", () => {
  const lang = (waId) => db.getContactByWaId(waId).language;

  test("a language fixed on the dashboard isn't changed by their messages", async () => {
    db.updateContact(contact(NEW_NUMBER).id, { language: "si", language_auto: 0 });
    const llm = scriptedLLM(["ok"]);
    await agentWith(llm).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "Do you have online classes?") });
    assert.equal(lang(NEW_NUMBER), "si");
    assert.match(llm.requests[0].messages.at(-1).content, /Reply in Sinhala/);
  });

  test("a plain \"hi\" gets an English reply, even from a contact who wrote Singlish before", async () => {
    db.updateContact(contact(NEW_NUMBER).id, { language: "singlish" });
    const llm = scriptedLLM(["Hi! How can I help?"]);
    await agentWith(llm).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "hi") });
    assert.equal(lang(NEW_NUMBER), "en");
    assert.match(llm.requests[0].messages.at(-1).content, /Reply in English/);
  });

  test("the language they write in is saved on the contact and named in the prompt", async () => {
    for (const [text, expected, name] of [
      ["class eka kawadada? fees kiyada?", "singlish", "Singlish"],
      ["idhu evlo? online class irukka?", "tanglish", "Tanglish"],
      ["මිල කීයද?", "si", "Sinhala"],
      ["விலை என்ன?", "ta", "Tamil"],
      ["How much is the maths class?", "en", "English"],
    ]) {
      const llm = scriptedLLM(["ok"]);
      await agentWith(llm).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, text) });
      assert.equal(lang(NEW_NUMBER), expected, text);
      assert.match(llm.requests[0].messages[0].content, new RegExp(`usual language: ${name}`), text);
    }
  });

  test("every request ends with a reminder of the reply language, after the user's message", async () => {
    const llm = scriptedLLM([{ tools: [["search_courses", {}]] }, "ok"]);
    await agentWith(llm).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "meeka kiyada?") });
    const [first] = llm.requests;
    assert.equal(first.messages.at(-2).content, "meeka kiyada?");
    assert.equal(first.messages.at(-1).role, "system");
    assert.match(first.messages.at(-1).content, /Reply in Singlish/);
    assert.match(first.messages.at(-1).content, /must come from the details, course list or a tool result/);
    assert.ok(llm.requests[1].messages.some((m) => m.role === "system" && /Reply in Singlish/.test(m.content)));
  });

  test("Singlish/Tanglish phrasing notes go only to contacts who use them", () => {
    const p = (language) => prompt({ ...contact(NEW_NUMBER), language });
    assert.match(p("singlish"), /"to know" is "dana ganna"/);
    assert.doesNotMatch(p("singlish"), /Tanglish wording/);
    assert.match(p("tanglish"), /Tanglish wording/);
    assert.doesNotMatch(p("en"), /Singlish wording|Tanglish wording/);
  });

  test("a message that doesn't show a language keeps the saved one", async () => {
    await agentWith(scriptedLLM(["ok"])).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "meeka kiyada?") });
    for (const text of ["ok", "thanks", "👍", "hari"]) {
      const llm = scriptedLLM(["ok"]);
      await agentWith(llm).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, text) });
      assert.equal(lang(NEW_NUMBER), "singlish", text);
    }
  });

  test("a photo (no text) keeps the saved language", async () => {
    const msg = { id: "wamid.photo", from: TAMIL, type: "image", text: null };
    db.logMessage({ id: msg.id, waId: TAMIL, direction: "in", type: "image", body: null });
    await agentWith(scriptedLLM(["ok"])).respond({ contact: contact(TAMIL), incoming: msg });
    assert.equal(lang(TAMIL), "ta");
  });

  test("a language the owner switched off: the reply and the fallback use English instead", async () => {
    db.saveReplyLanguages({ ta: false });
    const p = prompt(contact(TAMIL));
    assert.match(p, /only allows replies in Sinhala \(script or Singlish\) and English/);
    assert.match(p, /If they write in Tamil \(script or Tanglish\), reply in English/);
    const llm = scriptedLLM([new Error("Groq down")]);
    const r = await agentWith(llm).respond({ contact: contact(TAMIL), incoming: incoming(TAMIL, "விலை என்ன?") });
    assert.match(llm.requests[0].messages.at(-1).content, /Reply in English/);
    assert.equal(r.replies[0].body, FALLBACKS.en);
    assert.equal(lang(TAMIL), "ta", "what they write in is still remembered");
  });

  test("the fallback is sent in the contact's language", async () => {
    const fail = () => scriptedLLM([new Error("Groq down")]);
    const r1 = await agentWith(fail()).respond({ contact: contact(NEW_NUMBER), incoming: incoming(NEW_NUMBER, "idhu evlo?") });
    assert.equal(r1.replies[0].body, FALLBACKS.tanglish);
    const r2 = await agentWith(fail()).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "ok") });
    assert.equal(r2.replies[0].body, FALLBACKS.si, "REGULAR writes in Sinhala");
  });
});

describe("language detection", () => {
  for (const [text, expected] of [
    ["meeka kiyada?", "singlish"],
    ["Grade 10 maths class price evalo", "tanglish"],
    ["How much is the tea?", "en"],
    ["ok", null],
    ["hi", "en"],
    ["Hiii 👋", "en"],
    ["Hello!", "en"],
    ["hi machan", "singlish"],
    ["hi, evlo?", "tanglish"],
  ]) {
    test(`"${text}" -> ${expected}`, () => assert.equal(detectLanguage(text), expected));
  }
});

describe("WhatsApp formatting", () => {
  test("markdown is converted", () => {
    assert.equal(toWhatsApp("## Price\n**LKR 3,000** a month, see [list](https://x.example/t)"),
      "Price\n*LKR 3,000* a month, see list: https://x.example/t");
    assert.equal(toWhatsApp("x".repeat(5000)).length, 4096);
  });
});

describe("no made-up prices or promises", () => {
  test("unsupportedFacts: invented amounts are caught; known ones pass in any format", () => {
    const sources = "Grade 11 Maths · LKR 3,000\nAdmission fee LKR 1,000";
    assert.deepEqual(unsupportedFacts("Maths is Rs 3000 and admission LKR 1,000.", sources), []);
    assert.deepEqual(unsupportedFacts("Maths is LKR 2,500.", sources), ["LKR 2,500"]);
  });

  test("a reply with a made-up price is not sent: the model answers again", async () => {
    const llm = scriptedLLM(["Spoken English is LKR 4,000.", "Spoken English is LKR 4,500."]);
    const r = await agentWith(llm).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "spoken english fee") });
    assert.equal(r.replies[0].body, "Spoken English is LKR 4,500.");
    assert.equal(llm.requests.length, 2);
    assert.match(llm.requests[1].messages.at(-1).content, /NOT sent.*"LKR 4,000"/);
    assert.ok(r.toolLog.some((t) => t.name === "fact_check" && /LKR 4,000/.test(t.error)));
  });

  test("the admission fee from the institute details counts as known", async () => {
    const r = await agentWith(scriptedLLM(["The admission fee is LKR 1,000."])).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "admission fee?") });
    assert.equal(r.replies[0].body, "The admission fee is LKR 1,000.");
  });

  test("falsePromises: enrolling or reserving seats is caught; passing it to the office is fine", () => {
    assert.equal(falsePromises("I'll reserve a seat for you.").length, 1);
    assert.equal(falsePromises("I'll register you for the Saturday class.").length, 1);
    assert.equal(falsePromises("Your enrolment is confirmed!").length, 1);
    assert.equal(falsePromises("You're now enrolled in Grade 11 Maths.").length, 1);
    assert.deepEqual(falsePromises("Once you're registered, classes start on Saturday."), []);
    assert.equal(falsePromises("Send us an email.").length, 1);
    assert.deepEqual(falsePromises("I'll pass your enrolment request to the office, who will confirm it."), []);
    assert.equal(falsePromises("I've passed your details to the office.").length, 1, "only true after the handover");
    assert.deepEqual(falsePromises("I've passed your details to the office.", { handedOff: true }), []);
  });

  test("still promising after the retry: that sentence is removed", async () => {
    const llm = scriptedLLM(["Yes! I'll reserve a seat for you. Anything else?", "Sure. I'll reserve a seat for you. Anything else?"]);
    const r = await agentWith(llm).respond({ contact: contact(REGULAR), incoming: incoming(REGULAR, "keep a seat for me") });
    assert.equal(r.replies[0].body, "Sure. Anything else?");
  });
});
