import { createPromptInstructions } from "./prompt-instructions.js";
import {
  createSseRequester,
  createJsonRequester,
  getProviderConfig
} from "./json-api-client.js";

export function createCohereProvider(options = {}) {
  const { apiKey, model, fetchImplementation } = getProviderConfig(
    options,
    "Cohere",
    "COHERE_API_KEY"
  );
  const postJson = createJsonRequester(
    "Cohere",
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
      "https://api.cohere.com/v2/chat",
      {
        model,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: prompt }
        ]
      },
      { authorization: `Bearer ${apiKey}` }
    );
    const text = response?.message?.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (typeof text !== "string" || !text) {
      throw new Error("Cohere: The API returned no text response.");
    }

    const result = { text, provider: "cohere", model };
    const tokens = response?.usage?.tokens;
    if (Number.isFinite(tokens?.input_tokens) && Number.isFinite(tokens?.output_tokens)) {
      result.usage = {
        inputTokens: tokens.input_tokens,
        outputTokens: tokens.output_tokens
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

    for await (const event of createSseRequester(
      "Cohere",
      apiKey,
      fetchImplementation,
      "https://api.cohere.com/v2/chat",
      {
        model,
        stream: true,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: prompt }
        ]
      },
      { authorization: `Bearer ${apiKey}` },
      signal
    )) {
      const text = event?.delta?.message?.content?.text;
      if (typeof text === "string" && text) {
        yield { text, provider: "cohere", model };
      }

      const tokens = event?.usage?.tokens;
      if (
        Number.isFinite(tokens?.input_tokens) &&
        Number.isFinite(tokens?.output_tokens)
      ) {
        yield {
          text: "",
          provider: "cohere",
          model,
          usage: {
            inputTokens: tokens.input_tokens,
            outputTokens: tokens.output_tokens
          }
        };
      }
    }
  }

  return { generate, stream };
}
