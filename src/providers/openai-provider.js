import OpenAI from "openai";
import { handleError } from "../utils/handle-error.js";
import { createPromptInstructions } from "./prompt-instructions.js";

export function createOpenAIProvider(options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;

  if (apiKey && (typeof apiKey !== "string" || !apiKey.trim())) {
    throw new Error("OpenAI API key must be a non-empty string.");
  }

  const client = options.client || (
    apiKey ? new OpenAI({
      apiKey,
      ...(options.fetch ? { fetch: options.fetch } : {})
    }) : null
  );

  if (!client) {
    throw new Error("OpenAI API key is required.");
  }

  if (!options.model) {
    throw new Error("Please specify an OpenAI model.");
  }

  const model = options.model;
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

    try {
      const response = await client.responses.create({
        model,
        instructions,
        input: prompt
      });

      const result = {
        text: response.output_text,
        provider: "openai",
        model
      };
      if (
        Number.isFinite(response.usage?.input_tokens) &&
        Number.isFinite(response.usage?.output_tokens)
      ) {
        result.usage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        };
      }
      return result;
    } catch (error) {
      handleError(error, "OpenAI", apiKey);
    }
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

    try {
      const responseStream = await client.responses.create(
        { model, instructions, input: prompt, stream: true },
        { signal }
      );

      for await (const event of responseStream) {
        if (signal?.aborted) {
          const error = new Error("The operation was aborted.");
          error.name = "AbortError";
          throw error;
        }

        if (
          event.type === "response.output_text.delta" &&
          typeof event.delta === "string" &&
          event.delta
        ) {
          yield { text: event.delta, provider: "openai", model };
        }

        const usage = event.response?.usage;
        if (
          Number.isFinite(usage?.input_tokens) &&
          Number.isFinite(usage?.output_tokens)
        ) {
          yield {
            text: "",
            provider: "openai",
            model,
            usage: {
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens
            }
          };
        }
      }
    } catch (error) {
      if (signal?.aborted || error?.name === "AbortError") {
        const abort = new Error("The operation was aborted.");
        abort.name = "AbortError";
        throw abort;
      }
      handleError(error, "OpenAI", apiKey);
    }
  }

  return { generate, stream };
}