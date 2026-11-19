// AI client tests (ai/llm.js) with a fake fetch: no network, no API calls. Run: npm test

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { createLlmClient, defaultProvider } = require("../ai/llm");

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
  const c = createLlmClient({ provider: "groq", apiKey: "test-key", model: "m", fetchImpl, sleep: async (ms) => sleeps.push(ms), ...opts });
  return { c, sleeps };
};

describe("both providers", () => {
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

  test("no API key: fails clearly without calling the provider", async () => {
    for (const provider of ["groq", "gemini"]) {
      const f = fakeFetch([]);
      const c = createLlmClient({ provider, apiKey: "", fetchImpl: f });
      assert.equal(c.isConfigured(), false);
      await assert.rejects(c.chat({ messages: [] }), provider === "groq" ? /GROQ_API_KEY is not set/ : /GEMINI_API_KEY is not set/);
      assert.equal(f.calls.length, 0);
    }
  });
});

describe("Gemini", () => {
  const gemini = (fetchImpl, opts = {}) => {
    const sleeps = [];
    const c = createLlmClient({ provider: "gemini", apiKey: "g-key", fetchImpl, sleep: async (ms) => sleeps.push(ms), ...opts });
    return { c, sleeps };
  };

  test("uses Gemini's OpenAI-compatible endpoint, Gemini 3.5 Flash-Lite by default, and max_tokens", async () => {
    const f = fakeFetch([ok("hi")]);
    const { c } = gemini(f, { model: undefined });
    assert.equal(c.model, process.env.GEMINI_MODEL || "gemini-3.5-flash-lite");
    await c.chat({ messages: [{ role: "user", content: "x" }] });
    assert.equal(f.calls[0].url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    assert.equal(f.calls[0].auth, "Bearer g-key");
    assert.equal(f.calls[0].body.max_tokens, 4096);
    assert.equal(f.calls[0].body.max_completion_tokens, undefined);
  });

  test("'high demand' 503s are retried three times with growing waits", async () => {
    const busy = { status: 503, body: [{ error: { code: 503, message: "This model is currently experiencing high demand." } }] };
    const f = fakeFetch([busy, busy, busy, ok("finally")]);
    const { c, sleeps } = gemini(f);
    assert.equal((await c.chat({ messages: [] })).message.content, "finally");
    assert.deepEqual(sleeps, [1000, 2000, 4000]);
  });

  test("an error wrapped in an array still gives a readable message", async () => {
    const f = fakeFetch([{ status: 404, body: [{ error: { message: "models/gemini-2.5-flash is no longer available to new users" } }] }]);
    await assert.rejects(gemini(f).c.chat({ messages: [] }), /Gemini API 404: models\/gemini-2.5-flash is no longer available/);
  });

  test("tool calls come back as given, so the agent can send them back with the tool results", async () => {
    const toolCall = { id: "c1", type: "function", function: { name: "search_products", arguments: "{\"query\":\"tea\"}" },
      extra_content: { google: { thought_signature: "sig" } } };
    const f = fakeFetch([{ body: { choices: [{ message: { role: "assistant", content: null, tool_calls: [toolCall] }, finish_reason: "tool_calls" }] } }]);
    const r = await gemini(f).c.chat({ messages: [] });
    assert.deepEqual(r.message.tool_calls, [toolCall]);
  });
});

describe("choosing the provider", () => {
  test("AI_PROVIDER decides; without it Gemini is used when its key is set", () => {
    assert.equal(defaultProvider({ AI_PROVIDER: "groq", GEMINI_API_KEY: "x" }), "groq");
    assert.equal(defaultProvider({ AI_PROVIDER: " Gemini " }), "gemini");
    assert.equal(defaultProvider({ GEMINI_API_KEY: "x" }), "gemini");
    assert.equal(defaultProvider({ GROQ_API_KEY: "x" }), "groq");
    assert.throws(() => defaultProvider({ AI_PROVIDER: "openai" }), /AI_PROVIDER must be one of: gemini, nvidia, openrouter, groq/);
  });
});

describe("NVIDIA", () => {
  test("uses NVIDIA's endpoint, Kimi by default, max_tokens and the reasoning effort", async () => {
    const f = fakeFetch([ok("hi")]);
    const c = createLlmClient({ provider: "nvidia", apiKey: "nv-key", model: undefined, reasoningEffort: "low", fetchImpl: f });
    assert.equal(c.model, process.env.NVIDIA_MODEL || "moonshotai/kimi-k3.1-pro");
    await c.chat({ messages: [{ role: "user", content: "x" }] });
    assert.equal(f.calls[0].url, "https://integrate.api.nvidia.com/v1/chat/completions");
    assert.equal(f.calls[0].auth, "Bearer nv-key");
    assert.equal(f.calls[0].body.max_tokens, 4096);
    assert.equal(f.calls[0].body.reasoning_effort, "low");
  });

  test("errors name NVIDIA", async () => {
    const f = fakeFetch([{ status: 401, body: { error: { message: "Unauthorized" } } }]);
    const c = createLlmClient({ provider: "nvidia", apiKey: "bad", fetchImpl: f });
    await assert.rejects(c.chat({ messages: [] }), /NVIDIA API 401: Unauthorized/);
  });
});

describe("OpenRouter", () => {
  test("uses OpenRouter's endpoint and a free model by default", async () => {
    const f = fakeFetch([ok("hi")]);
    const c = createLlmClient({ provider: "openrouter", apiKey: "or-key", model: undefined, fetchImpl: f });
    assert.equal(c.model, process.env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-super-vl:free");
    assert.match(c.model, /:free$/);
    await c.chat({ messages: [{ role: "user", content: "x" }] });
    assert.equal(f.calls[0].url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(f.calls[0].auth, "Bearer or-key");
    assert.equal(f.calls[0].body.max_tokens, 2048);
  });

  test("a free model's provider limit (429) is retried, then reported", async () => {
    const limited = { status: 429, body: { error: { message: "Provider returned error" } } };
    const f = fakeFetch([limited, limited, limited]);
    const c = createLlmClient({ provider: "openrouter", apiKey: "or-key", fetchImpl: f, sleep: async () => {} });
    await assert.rejects(c.chat({ messages: [] }), /OpenRouter API 429: Provider returned error/);
    assert.equal(f.calls.length, 3);
  });
});
