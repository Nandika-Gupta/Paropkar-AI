// Amplify function secrets: the env var GROQ_API_KEY holds the SSM parameter
// *path* (e.g. /amplify/<appId>/<env>/AMPLIFY_paropkarGroq_GROQ_API_KEY), not
// the key itself. For local runs a literal key in the env var is also accepted.

let cached = null;

async function readSsmParameter(name, region) {
  const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
  const out = await new SSMClient({ region }).send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  return out.Parameter?.Value || '';
}

async function getGroqApiKey({ env = process.env, getParameter = readSsmParameter } = {}) {
  if (cached) return cached;

  const value = env.GROQ_API_KEY || '';
  if (!value) return '';

  cached = value.startsWith('/') ? await getParameter(value, env.REGION) : value;
  return cached;
}

function resetSecretCache() {
  cached = null;
}

module.exports = { getGroqApiKey, resetSecretCache };
