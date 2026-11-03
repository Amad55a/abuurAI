import { createPromptInstructions } from "./prompt-instructions.js";
import {
  createChatCompletionRequest,
  createChatCompletionStream,
  createJsonRequester,
  extractChatCompletionText,
  getProviderConfig
} from "./json-api-client.js";

export function createPerplexityProvider(options = {}) {
  const { apiKey, model, fetchImplementation } = getProviderConfig(
    options,
    "Perplexity",
    "PERPLEXITY_API_KEY"
  );
  const endpoint = options.endpoint || "https://api.perplexity.ai/chat/completions";
  const postJson = createJsonRequester(
    "Perplexity",
    apiKey,
    fetchImplementation
  );
  const stream = createChatCompletionStream({
    provider: "perplexity",
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
      text: extractChatCompletionText(response, "Perplexity"),
      provider: "perplexity",
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
