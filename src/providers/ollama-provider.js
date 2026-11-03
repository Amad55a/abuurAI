import { createPromptInstructions } from "./prompt-instructions.js";
import {
  createChatCompletionRequest,
  createChatCompletionStream,
  createJsonRequester,
  extractChatCompletionText
} from "./json-api-client.js";

function normalizeOllamaEndpoint(endpoint = "http://localhost:11434/v1") {
  const clean = String(endpoint).trim().replace(/\/+$/, "");
  if (clean.endsWith("/chat/completions")) {
    return clean;
  }
  if (clean.endsWith("/v1")) {
    return `${clean}/chat/completions`;
  }
  return `${clean}/v1/chat/completions`;
}

export function createOllamaProvider(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Ollama provider options must be an object.");
  }

  if (typeof options.model !== "string" || !options.model.trim()) {
    throw new Error("Please specify an Ollama model.");
  }

  const rawKey = options.apiKey ?? globalThis.process?.env?.OLLAMA_API_KEY;
  if (rawKey !== undefined && (typeof rawKey !== "string" || !rawKey.trim())) {
    throw new Error("Ollama API key must be a non-empty string.");
  }
  const apiKey = rawKey?.trim();

  const fetchImplementation = options.fetch || globalThis.fetch;
  if (typeof fetchImplementation !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const rawEndpoint =
    options.endpoint ||
    options.cinwaankaAPI ||
    options.baseURL ||
    globalThis.process?.env?.OLLAMA_ENDPOINT ||
    globalThis.process?.env?.OLLAMA_HOST ||
    "http://localhost:11434/v1";

  const endpoint = normalizeOllamaEndpoint(rawEndpoint);
  const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};

  const postJson = createJsonRequester(
    "Ollama",
    apiKey,
    fetchImplementation
  );
  const stream = createChatCompletionStream({
    provider: "ollama",
    apiKey,
    model: options.model,
    fetchImplementation,
    endpoint,
    headers
  });

  async function generate({
    prompt,
    language = "automatic",
    systemPrompt,
    operationInstructions
  }) {
    const instructions = createPromptInstructions({
      language,
      systemPrompt,
      operationInstructions
    });
    const response = await postJson(
      endpoint,
      createChatCompletionRequest(options.model, instructions, prompt),
      headers
    );

    const result = {
      text: extractChatCompletionText(response, "Ollama"),
      provider: "ollama",
      model: options.model
    };
    const usage = response?.usage;
    if (Number.isFinite(usage?.prompt_tokens) && Number.isFinite(usage?.completion_tokens)) {
      result.usage = {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens
      };
    }
    return result;
  }

  return { generate, stream, endpoint };
}
