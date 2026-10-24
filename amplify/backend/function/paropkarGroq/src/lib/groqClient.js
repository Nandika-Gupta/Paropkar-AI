// Minimal Groq chat-completions client. Injected into extractFields so tests
// and the eval smoke run can swap in a mock.

class GroqError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
  }
}

function createGroqClient({
  apiKey,
  fetchImpl = globalThis.fetch,
  baseUrl = 'https://api.groq.com/openai/v1',
  timeoutMs = 20000,
} = {}) {
  if (!apiKey) throw new Error('createGroqClient: apiKey is required');

  return {
    async chat({ model, messages, temperature = 0, maxTokens = 400, jsonMode = false }) {
      const body = { model, messages, temperature, max_tokens: maxTokens };
      if (jsonMode) body.response_format = { type: 'json_object' };

      const started = Date.now();
      const res = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const latencyMs = Date.now() - started;

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new GroqError(`Groq API ${res.status}: ${detail.slice(0, 300)}`, res.status);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content ?? '',
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
        },
        latencyMs,
        model: data.model || model,
      };
    },
  };
}

module.exports = { createGroqClient, GroqError };
