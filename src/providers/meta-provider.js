import { createPromptInstructions } from "./prompt-instructions.js";
import {
  createChatCompletionRequest,
  createChatCompletionStream,
  createJsonRequester,
  extractChatCompletionText,
  getProviderConfig
} from "./json-api-client.js";

/**
 * Meta Model API provider.
 * Connects to Meta's official hosted platform (https://api.meta.ai/v1) using an API key from dev.meta.ai.
 * To run open-weight Llama models locally instead of using hosted Meta API, use the 'ollama' provider.
 */
export function createMetaProvider(options = {}) {
  const { apiKey, model, fetchImplementation } = getProviderConfig(
    options,
    "Meta",
    "META_API_KEY"
  );
  const endpoint = options.endpoint || "https://api.meta.ai/v1/chat/completions";
  const postJson = createJsonRequester(
    "Meta",
    apiKey,
    fetchImplementation
  );
  const stream = createChatCompletionStream({
    provider: "meta",
    apiKey,
    model,
    fetchImplementation,
    endpoint
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
      createChatCompletionRequest(model, instructions, prompt),
      { authorization: `Bearer ${apiKey}` }
    );

    const result = {
      text: extractChatCompletionText(response, "Meta"),
      provider: "meta",
      model
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

  return { generate, stream };
}
