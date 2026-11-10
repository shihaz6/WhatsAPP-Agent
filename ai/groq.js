// Minimal Groq chat-completions client (OpenAI-compatible API) using built-in fetch.
// Retries rate limits (429) and server errors, honouring Groq's retry-after header.

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

class GroqError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function createGroqClient({
  apiKey = process.env.GROQ_API_KEY,
  model = process.env.GROQ_MODEL || DEFAULT_MODEL,
  // Optional for gpt-oss models (low/medium/high). Unset = Groq's default. Tested: "low"
  // skipped tool calls and invented classes, so don't lower it without re-testing.
  reasoningEffort = process.env.GROQ_REASONING_EFFORT || undefined,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = 30_000,
  maxRetries = 2,
  maxWaitMs = 30_000, // never sleep longer than this for one retry (the user sees "typing…")
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  async function chat({ messages, tools, temperature = 0.3, maxTokens = 1024 }) {
    if (!apiKey) throw new GroqError("GROQ_API_KEY is not set", 0);
    const body = JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      ...(reasoningEffort && /gpt-oss/.test(model) ? { reasoning_effort: reasoningEffort } : {}),
      ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
    });

    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetchImpl(API_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        if (attempt < maxRetries) { await sleep(1000 * (attempt + 1)); continue; }
        throw new GroqError(`Groq request failed: ${err.message}`, 0);
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const choice = data.choices?.[0];
        if (!choice?.message) throw new GroqError("Groq returned no message", res.status);
        return { message: choice.message, finishReason: choice.finish_reason, usage: data.usage };
      }

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
        if (wait <= maxWaitMs) { await sleep(wait); continue; }
      }
      throw new GroqError(`Groq API ${res.status}: ${data.error?.message ?? "unknown error"}`, res.status);
    }
  }

  return { chat, model, isConfigured: () => Boolean(apiKey) };
}

module.exports = { createGroqClient, GroqError, DEFAULT_MODEL };
