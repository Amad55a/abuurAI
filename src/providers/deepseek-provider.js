import { createPromptInstructions } from "./prompt-instructions.js";
import {
  createChatCompletionRequest,
  createChatCompletionStream,
  createJsonRequester,
  extractChatCompletionText,
  getProviderConfig
} from "./json-api-client.js";

export function createDeepSeekProvider(options = {}) {
  const { apiKey, model, fetchImplementation } = getProviderConfig(
    options,
    "DeepSeek",
    "DEEPSEEK_API_KEY"
  );
  const postJson = createJsonRequester(
    "DeepSeek",
    apiKey,
    fetchImplementation
  );
  const stream = createChatCompletionStream({
    provider: "deepseek",
    apiKey,
    model,
    fetchImplementation,
    endpoint: "https://api.deepseek.com/chat/completions"
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
      "https://api.deepseek.com/chat/completions",
      createChatCompletionRequest(model, instructions, prompt),
      { authorization: `Bearer ${apiKey}` }
    );

    const result = {
      text: extractChatCompletionText(response, "DeepSeek"),
      provider: "deepseek",
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
