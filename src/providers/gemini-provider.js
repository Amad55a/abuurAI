
import { GoogleGenAI } from "@google/genai";
import { handleError } from "../utils/handle-error.js";
import { createPromptInstructions } from "./prompt-instructions.js";

export function createGeminiProvider(options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

  if (apiKey && (typeof apiKey !== "string" || !apiKey.trim())) {
    throw new Error("Gemini API key must be a non-empty string.");
  }

  if (!apiKey) {
    throw new Error("Gemini API key is required.");
  }

  if (!options.model) {
    throw new Error("Please specify a Gemini model.");
  }

  const client = options.client || new GoogleGenAI({
    apiKey,
    ...(options.fetch ? { httpOptions: { fetch: options.fetch } } : {})
  });
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
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: instructions
        }
      });

      const result = {
        text: response.text,
        provider: "gemini",
        model
      };
      const usage = response.usageMetadata;
      if (
        Number.isFinite(usage?.promptTokenCount) &&
        Number.isFinite(usage?.candidatesTokenCount)
      ) {
        result.usage = {
          inputTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount
        };
      }
      return result;
    } catch (error) {
      handleError(error, "Gemini", apiKey);
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
      const responseStream = await client.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          systemInstruction: instructions,
          abortSignal: signal
        }
      });

      for await (const chunk of responseStream) {
        if (signal?.aborted) {
          const error = new Error("The operation was aborted.");
          error.name = "AbortError";
          throw error;
        }

        if (typeof chunk.text === "string" && chunk.text) {
          yield { text: chunk.text, provider: "gemini", model };
        }

        const usage = chunk.usageMetadata;
        if (
          Number.isFinite(usage?.promptTokenCount) &&
          Number.isFinite(usage?.candidatesTokenCount)
        ) {
          yield {
            text: "",
            provider: "gemini",
            model,
            usage: {
              inputTokens: usage.promptTokenCount,
              outputTokens: usage.candidatesTokenCount
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
      handleError(error, "Gemini", apiKey);
    }
  }

  return { generate, stream };
}
