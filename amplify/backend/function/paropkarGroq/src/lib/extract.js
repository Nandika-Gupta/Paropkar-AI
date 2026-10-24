const fs = require('fs');
const path = require('path');
const { validateExtraction } = require('./schema');

const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_PROMPT_VERSION = 'v1';
const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

const promptCache = new Map();

function loadPrompt(version) {
  if (!/^v\d+$/.test(version)) throw new Error(`Invalid prompt version: ${version}`);
  if (!promptCache.has(version)) {
    promptCache.set(version, fs.readFileSync(path.join(PROMPTS_DIR, `extract_${version}.txt`), 'utf8'));
  }
  return promptCache.get(version);
}

/** Parse a model reply as JSON, tolerating surrounding code fences. */
function parseJsonReply(content) {
  const trimmed = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (err) {
    return { ok: false, error: `invalid JSON: ${err.message}` };
  }
}

/**
 * Extract certificate fields from Textract LINE texts using the LLM.
 * One retry on invalid JSON or schema failure; after that needsReview is true.
 * Never throws for model or network problems — those also set needsReview.
 *
 * @param {string[]} textractLines
 * @param {{client: {chat: Function}, model?: string, promptVersion?: string}} opts
 */
async function extractFields(textractLines, { client, model = DEFAULT_MODEL, promptVersion = DEFAULT_PROMPT_VERSION } = {}) {
  if (!client) throw new Error('extractFields: client is required');

  const result = {
    fields: null,
    raw: null,
    needsReview: true,
    reviewReasons: [],
    attempts: 0,
    schemaValidFirstAttempt: false,
    usage: { promptTokens: 0, completionTokens: 0 },
    latencyMs: 0,
    model,
    promptVersion,
  };

  const lines = Array.isArray(textractLines)
    ? textractLines.filter(l => typeof l === 'string' && l.trim())
    : [];
  if (!lines.length) {
    result.reviewReasons.push('no_text');
    return result;
  }

  const messages = [
    { role: 'system', content: loadPrompt(promptVersion) },
    { role: 'user', content: JSON.stringify(lines) },
  ];

  const MAX_ATTEMPTS = 2;
  let lastError = null;

  while (result.attempts < MAX_ATTEMPTS) {
    result.attempts += 1;

    let reply;
    try {
      reply = await client.chat({ model, messages, temperature: 0, jsonMode: true });
    } catch (err) {
      result.reviewReasons.push('llm_error');
      result.error = err.message;
      return result;
    }

    result.usage.promptTokens += reply.usage?.promptTokens || 0;
    result.usage.completionTokens += reply.usage?.completionTokens || 0;
    result.latencyMs += reply.latencyMs || 0;

    const parsed = parseJsonReply(reply.content);
    let errors;
    if (parsed.ok) {
      result.raw = parsed.value;
      const validation = validateExtraction(parsed.value);
      if (validation.success) {
        result.fields = validation.data;
        result.needsReview = false;
        if (result.attempts === 1) result.schemaValidFirstAttempt = true;
        return result;
      }
      errors = validation.errors;
    } else {
      errors = [parsed.error];
    }

    lastError = errors.join('; ');
    messages.push(
      { role: 'assistant', content: String(reply.content || '') },
      {
        role: 'user',
        content: `Your reply was not valid: ${lastError}. Reply again with only the JSON object in the required format.`,
      },
    );
  }

  result.reviewReasons.push('invalid_output');
  result.error = lastError;
  return result;
}

module.exports = { extractFields, loadPrompt, parseJsonReply, DEFAULT_MODEL, DEFAULT_PROMPT_VERSION };
