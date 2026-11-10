// Groq client tests with a fake fetch (no network). Run: npm test

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createGroqClient } = require("../ai/groq");

function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body), auth: opts.headers.Authorization });
    const r = responses[calls.length - 1];
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: r.headers ?? {} });
  };
  fn.calls = calls;
  return fn;
}
const ok = (content) => ({ body: { choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }] } });
const client = (fetchImpl, opts = {}) => {
  const sleeps = [];
  const c = createGroqClient({ apiKey: "test-key", model: "m", fetchImpl, sleep: async (ms) => sleeps.push(ms), ...opts });
  return { c, sleeps };
};

test("sends model, messages and tools; returns the message", async () => {
  const f = fakeFetch([ok("hi")]);
  const { c } = client(f);
  const tools = [{ type: "function", function: { name: "t", parameters: { type: "object", properties: {} } } }];
  const r = await c.chat({ messages: [{ role: "user", content: "x" }], tools });
  assert.equal(r.message.content, "hi");
  assert.equal(f.calls[0].auth, "Bearer test-key");
  assert.equal(f.calls[0].body.model, "m");
  assert.equal(f.calls[0].body.tool_choice, "auto");
  assert.deepEqual(f.calls[0].body.tools, tools);
});

test("retries a 429 after the retry-after time", async () => {
  const f = fakeFetch([{ status: 429, body: { error: { message: "rate limit" } }, headers: { "retry-after": "2" } }, ok("done")]);
  const { c, sleeps } = client(f);
  assert.equal((await c.chat({ messages: [] })).message.content, "done");
  assert.deepEqual(sleeps, [2000]);
});

test("retries server errors and network failures, then gives up", async () => {
  const f = fakeFetch([{ status: 503, body: {} }, new Error("ECONNRESET"), { status: 500, body: { error: { message: "down" } } }]);
  const { c } = client(f);
  await assert.rejects(c.chat({ messages: [] }), /Groq API 500: down/);
  assert.equal(f.calls.length, 3);
});

test("doesn't wait out a very long rate limit", async () => {
  const f = fakeFetch([{ status: 429, body: { error: { message: "daily limit" } }, headers: { "retry-after": "3600" } }]);
  const { c, sleeps } = client(f);
  await assert.rejects(c.chat({ messages: [] }), /429: daily limit/);
  assert.deepEqual(sleeps, []);
});

test("other errors are not retried", async () => {
  const f = fakeFetch([{ status: 400, body: { error: { message: "bad tool schema" } } }]);
  await assert.rejects(client(f).c.chat({ messages: [] }), /400: bad tool schema/);
  assert.equal(f.calls.length, 1);
});

test("no API key: fails clearly without calling Groq", async () => {
  const f = fakeFetch([]);
  const c = createGroqClient({ apiKey: "", fetchImpl: f });
  assert.equal(c.isConfigured(), false);
  await assert.rejects(c.chat({ messages: [] }), /GROQ_API_KEY/);
  assert.equal(f.calls.length, 0);
});
