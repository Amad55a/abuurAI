export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_PROMPT_CHARS = 24 * 1024;
export const MAX_INSTRUCTIONS_CHARS = 8 * 1024;

const supportedProviders = new Set([
  "gemini",
  "openai",
  "anthropic",
  "mistral",
  "deepseek",
  "cohere",
  "xai",
  "openrouter"
]);

async function readBoundedJson(request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return {
      error: "Request body exceeds the 32 KB limit.",
      code: "REQUEST_TOO_LARGE",
      status: 413
    };
  }

  if (!request.body) {
    return { error: "Request body is required.", code: "BODY_REQUIRED", status: 400 };
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return {
          error: "Request body exceeds the 32 KB limit.",
          code: "REQUEST_TOO_LARGE",
          status: 413
        };
      }
      chunks.push(value);
    }
  } catch {
    return {
      error: "Could not read the request body.",
      code: "BODY_READ_FAILED",
      status: 400
    };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return {
      error: "Request body must contain valid JSON.",
      code: "INVALID_JSON",
      status: 400
    };
  }
}

function parseModelAllowlist(env) {
  let allowedModels;
  try {
    allowedModels = JSON.parse(env.ALLOWED_MODELS || "");
  } catch {
    throw new Error("ALLOWED_MODELS must be valid JSON.");
  }
  if (!allowedModels || typeof allowedModels !== "object" || Array.isArray(allowedModels)) {
    throw new Error("ALLOWED_MODELS must be an object keyed by provider.");
  }
  return allowedModels;
}

function validatePayload(payload, env) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Request body must be an object.";
  }
  const allowedFields = new Set([
    "accountId",
    "gatewayId",
    "provider",
    "model",
    "prompt",
    "instructions"
  ]);
  if (Object.keys(payload).some((key) => !allowedFields.has(key))) {
    return "Request contains unsupported fields.";
  }
  if (
    typeof env.ACCOUNT_ID !== "string" ||
    typeof env.GATEWAY_ID !== "string" ||
    payload.accountId !== env.ACCOUNT_ID ||
    payload.gatewayId !== env.GATEWAY_ID
  ) {
    return "Configured Cloudflare account or gateway does not match this Worker.";
  }
  if (
    typeof payload.provider !== "string" ||
    !supportedProviders.has(payload.provider)
  ) {
    return "Unsupported provider.";
  }
  if (typeof payload.model !== "string" || !payload.model.trim() || payload.model.length > 200) {
    return "Model must be a non-empty model identifier of at most 200 characters.";
  }
  if (typeof payload.prompt !== "string" || !payload.prompt.trim()) {
    return "Prompt must be a non-empty string.";
  }
  if (payload.prompt.length > MAX_PROMPT_CHARS) {
    return "Prompt exceeds the 24 KB limit.";
  }
  if (typeof payload.instructions !== "string" || !payload.instructions.trim()) {
    return "Instructions must be a non-empty string.";
  }
  if (payload.instructions.length > MAX_INSTRUCTIONS_CHARS) {
    return "Instructions exceed the 8 KB limit.";
  }

  let allowlist;
  try {
    allowlist = parseModelAllowlist(env);
  } catch (error) {
    return error.message;
  }
  if (
    !Array.isArray(allowlist[payload.provider]) ||
    !allowlist[payload.provider].includes(payload.model)
  ) {
    return "The requested model is not enabled for this provider.";
  }
  return null;
}

function extractText(output) {
  if (typeof output === "string") {
    return output;
  }
  if (typeof output?.response === "string") {
    return output.response;
  }
  const content = output?.choices?.[0]?.message?.content ??
    output?.message?.content ??
    output?.content ??
    output?.candidates?.[0]?.content?.parts;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((part) =>
        (part?.type === "text" || typeof part?.text === "string") &&
        typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("");
  }
  return null;
}

export { extractText, readBoundedJson, validatePayload };
