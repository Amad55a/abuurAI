import { createPromptInstructions } from "./prompt-instructions.js";
import {
  createChatCompletionRequest,
  createChatCompletionStream,
  createJsonRequester,
  extractChatCompletionText,
  getProviderConfig
} from "./json-api-client.js";

/**
 * NVIDIA NIM provider.
 * Connects to NVIDIA NIM hosted API (https://integrate.api.nvidia.com/v1) or self-hosted NIM containers.
 */
export function createNvidiaProvider(options = {}) {
  const { apiKey, model, fetchImplementation } = getProviderConfig(
    options,
    "NVIDIA",
    "NVIDIA_API_KEY"
  );
  const endpoint = options.endpoint || "https://integrate.api.nvidia.com/v1/chat/completions";
  const postJson = createJsonRequester(
    "NVIDIA",
    apiKey,
    fetchImplementation
  );
  const stream = createChatCompletionStream({
    provider: "nvidia",
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
      text: extractChatCompletionText(response, "NVIDIA"),
      provider: "nvidia",
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
