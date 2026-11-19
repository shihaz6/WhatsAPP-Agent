// Minimal chat-completions client for the AI model, using built-in fetch. Gemini, NVIDIA, OpenRouter and Groq
// all offer the OpenAI chat-completions format, so the agent works the same with any of them.
// Retries rate limits (429) and server errors (e.g. Gemini's 503 "high demand"), honouring a
// retry-after header when there is one.
//
// AI_PROVIDER picks the provider: "gemini", "nvidia", "openrouter" or "groq". Unset: Gemini when GEMINI_API_KEY is set,
// otherwise Groq.

const PROVIDERS = {
  gemini: {
    name: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyVar: "GEMINI_API_KEY",
    modelVar: "GEMINI_MODEL",
    // New Gemini keys can't use 2.5 models any more (Google: "no longer available to new users").
    // Flash-Lite: tested 19 Nov 2026 at ~2 s per call, while 3.8 Flash was overloaded (27 s, then timeouts).
    defaultModel: "gemini-3.5-flash-lite",
    effortVar: "GEMINI_REASONING_EFFORT",
    // Gemini Flash is often briefly overloaded (503 "high demand"): one more try than Groq.
    maxRetries: 3,
    // Gemini's compatibility layer documents max_tokens; it counts thinking tokens too.
    tokens: (n) => ({ max_tokens: n }),
    maxTokens: 4096,
  },
  nvidia: {
    name: "NVIDIA",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    keyVar: "NVIDIA_API_KEY",
    modelVar: "NVIDIA_MODEL",
    defaultModel: "moonshotai/kimi-k3.1-pro",
    // low / medium / high for reasoning models such as Kimi; unset = the model's default.
    effortVar: "NVIDIA_REASONING_EFFORT",
    maxRetries: 2,
    tokens: (n) => ({ max_tokens: n }),
    // Reasoning models spend tokens thinking before they answer.
    maxTokens: 4096,
  },
  openrouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyVar: "OPENROUTER_API_KEY",
    modelVar: "OPENROUTER_MODEL",
    // A free model (":free" costs nothing but has daily request limits) that supports tool calls.
    // Tested 20 Nov 2026: tool calls right, ~1 s per call, natural Singlish. (Gemma 4 31B free was
    // rate-limited by its host at the time.)
    defaultModel: "nvidia/nemotron-3.5-super-vl:free",
    effortVar: "OPENROUTER_REASONING_EFFORT",
    maxRetries: 2,
    tokens: (n) => ({ max_tokens: n }),
    maxTokens: 2048,
  },
  groq: {
    name: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyVar: "GROQ_API_KEY",
    modelVar: "GROQ_MODEL",
    defaultModel: "openai/gpt-oss-120b",
    // Optional for gpt-oss models (low/medium/high). Tested with the old tutor bot: "low" skipped
    // tool calls and invented facts, so don't lower it without re-testing.
    effortVar: "GROQ_REASONING_EFFORT",
    maxRetries: 2,
    tokens: (n) => ({ max_completion_tokens: n }),
    maxTokens: 1024,
  },
};

class LlmError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function defaultProvider(env = process.env) {
  const chosen = (env.AI_PROVIDER || "").trim().toLowerCase();
  if (chosen) {
    if (!PROVIDERS[chosen]) throw new Error(`AI_PROVIDER must be one of: ${Object.keys(PROVIDERS).join(", ")} (got "${chosen}")`);
    return chosen;
  }
  return env.GEMINI_API_KEY ? "gemini" : "groq";
}

function createLlmClient({
  provider = defaultProvider(),
  apiKey,
  model,
  reasoningEffort,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = 30_000,
  maxRetries,
  maxWaitMs = 30_000, // never sleep longer than this for one retry (the user sees "typing…")
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown AI provider "${provider}"`);
  apiKey ??= process.env[p.keyVar];
  model ??= process.env[p.modelVar] || p.defaultModel;
  reasoningEffort ??= process.env[p.effortVar] || undefined;
  maxRetries ??= p.maxRetries;

  async function chat({ messages, tools, temperature = 0.3, maxTokens = p.maxTokens }) {
    if (!apiKey) throw new LlmError(`${p.keyVar} is not set`, 0);
    const body = JSON.stringify({
      model,
      messages,
      temperature,
      ...p.tokens(maxTokens),
      ...(reasoningEffort && (provider !== "groq" || /gpt-oss/.test(model)) ? { reasoning_effort: reasoningEffort } : {}),
      ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
    });

    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetchImpl(p.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        if (attempt < maxRetries) { await sleep(1000 * (attempt + 1)); continue; }
        throw new LlmError(`${p.name} request failed: ${err.message}`, 0);
      }

      const raw = await res.json().catch(() => ({}));
      // Gemini sometimes wraps an error in a one-item array.
      const data = Array.isArray(raw) ? (raw[0] ?? {}) : raw;
      if (res.ok) {
        const choice = data.choices?.[0];
        if (!choice?.message) throw new LlmError(`${p.name} returned no message`, res.status);
        return { message: choice.message, finishReason: choice.finish_reason, usage: data.usage };
      }

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
        if (wait <= maxWaitMs) { await sleep(wait); continue; }
      }
      throw new LlmError(`${p.name} API ${res.status}: ${data.error?.message ?? "unknown error"}`, res.status);
    }
  }

  return { chat, provider, model, keyVar: p.keyVar, isConfigured: () => Boolean(apiKey) };
}

module.exports = { createLlmClient, defaultProvider, LlmError, PROVIDERS };
