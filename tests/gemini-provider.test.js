
import { test } from "node:test";
import assert from "node:assert/strict";

import { createGeminiProvider } from "../src/providers/gemini-provider.js";

test("Gemini provider sends requests correctly", async () => {
  let receivedRequest;

  const fakeClient = {
    models: {
      generateContent: async (request) => {
        receivedRequest = request;

        return {
          text: "Salaan! Waxaan ahay Gemini."
        };
      }
    }
  };

  const provider = createGeminiProvider({
    apiKey: "test-key",
    model: "test-model",
    client: fakeClient
  });

  const result = await provider.generate({
    prompt: "Is baro af Soomaali.",
    language: "automatic"
  });

  assert.equal(result.text, "Salaan! Waxaan ahay Gemini.");
  assert.equal(result.provider, "gemini");
  assert.equal(result.model, "test-model");
  assert.equal(receivedRequest.contents, "Is baro af Soomaali.");
  assert.equal(
    receivedRequest.config.systemInstruction,
    "Respond in the same language as the user's message. For Somali responses, use natural, standard Somali spelling and grammar."
  );
});

test("Gemini provider prioritizes translation requirements over global instructions", async () => {
  let systemInstruction;
  const provider = createGeminiProvider({
    apiKey: "test-key",
    model: "test-model",
    client: {
      models: {
        generateContent: async (request) => {
          systemInstruction = request.config.systemInstruction;
          return { text: "Salaan, sidee tahay?" };
        }
      }
    }
  });

  await provider.generate({
    prompt: "Hello, how are you?",
    language: "Somali",
    systemPrompt: "Include a detailed explanation.",
    operationInstructions: "Return only the translation."
  });

  assert.match(systemInstruction, /Global developer instructions:\nInclude a detailed explanation\./);
  assert.match(systemInstruction, /Mandatory operation requirements/);
  assert.ok(
    systemInstruction.indexOf("Mandatory operation requirements") >
      systemInstruction.indexOf("Global developer instructions")
  );
  assert.match(systemInstruction, /Return only the translation\./);
});

test("Gemini provider redacts configured API keys from provider errors", async () => {
  const secret = "FAKE_GEMINI_TEST_KEY";
  const provider = createGeminiProvider({
    apiKey: secret,
    model: "test-model",
    client: {
      models: {
        generateContent: async () => {
          throw new Error(`Request failed with ${secret}`);
        }
      }
    }
  });

  await assert.rejects(
    () => provider.generate({ prompt: "Test" }),
    (error) => {
      assert.doesNotMatch(error.message, new RegExp(secret));
      assert.match(error.message, /\[REDACTED\]/);
      return true;
    }
  );
});

test("Gemini provider streams text and actual token usage", async () => {
  let receivedRequest;
  const provider = createGeminiProvider({
    apiKey: "fake-gemini-stream-key",
    model: "test-model",
    client: {
      models: {
        generateContentStream: async (request) => {
          receivedRequest = request;
          return (async function* () {
            yield { text: "Salaan ", usageMetadata: undefined };
            yield {
              text: "dunida.",
              usageMetadata: {
                promptTokenCount: 9,
                candidatesTokenCount: 4
              }
            };
          })();
        }
      }
    }
  });
  const controller = new AbortController();
  const chunks = [];

  for await (const chunk of provider.stream({
    prompt: "Hello",
    systemPrompt: "Speak Somali.",
    signal: controller.signal
  })) {
    chunks.push(chunk);
  }

  assert.equal(receivedRequest.config.abortSignal, controller.signal);
  assert.equal(receivedRequest.config.systemInstruction.includes("Speak Somali."), true);
  assert.deepEqual(chunks.map((chunk) => chunk.text), ["Salaan ", "dunida.", ""]);
  assert.deepEqual(chunks[2].usage, { inputTokens: 9, outputTokens: 4 });
});
