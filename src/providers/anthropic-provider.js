import { createPromptInstructions } from "./prompt-instructions.js";
import {
  createSseRequester,
  createJsonRequester,
  getProviderConfig
} from "./json-api-client.js";

export function createAnthropicProvider(options = {}) {
  const { apiKey, model, fetchImplementation } = getProviderConfig(
    options,
    "Anthropic",
    "ANTHROPIC_API_KEY"
  );
  const postJson = createJsonRequester(
    "Anthropic",
    apiKey,
    fetchImplementation
  );

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
      "https://api.anthropic.com/v1/messages",
      {
        model,
        max_tokens: 1024,
        system: instructions,
        messages: [{ role: "user", content: prompt }]
      },
      {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    );
    const text = response?.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (typeof text !== "string" || !text) {
      throw new Error("Anthropic: The API returned no text response.");
    }

    const result = { text, provider: "anthropic", model };
    if (
      Number.isFinite(response?.usage?.input_tokens) &&
      Number.isFinite(response?.usage?.output_tokens)
    ) {
      result.usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      };
    }
    return result;
  }

  async function* stream({
    prompt,
    language = "automatic",
    systemPrompt,
    operationInstructions,
    signal
  }) {
    const instructions = createPromptInstructions({
      language,
      systemPrompt,
      operationInstructions
    });

    let inputTokens;
    for await (const event of createSseRequester(
      "Anthropic",
      apiKey,
      fetchImplementation,
      "https://api.anthropic.com/v1/messages",
      {
        model,
        max_tokens: 1024,
        system: instructions,
        messages: [{ role: "user", content: prompt }],
        stream: true
      },
      {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      signal
    )) {
      if (event.type === "content_block_delta" && typeof event.delta?.text === "string") {
        yield { text: event.delta.text, provider: "anthropic", model };
      }

      const eventInputTokens = event.message?.usage?.input_tokens;
      const outputTokens = event.usage?.output_tokens;
      if (Number.isFinite(eventInputTokens)) {
        inputTokens = eventInputTokens;
      }
      if (Number.isFinite(inputTokens) && Number.isFinite(outputTokens)) {
        yield {
          text: "",
          provider: "anthropic",
          model,
          usage: { inputTokens, outputTokens }
        };
      }
    }
  }

  return { generate, stream };
}
