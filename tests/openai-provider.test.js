import test from "node:test";
import assert from "node:assert/strict";
import { createOpenAIProvider } from "../src/providers/openai-provider.js";

test("OpenAI provider sends requests correctly", async () => {
  let receivedRequest;

  const fakeClient = {
    responses: {
      create: async (request) => {
        receivedRequest = request;

        return {
          output_text: "Salaan! Sideen kuu caawin karaa?"
        };
      }
    }
  };

  const provider = createOpenAIProvider({
    client: fakeClient,
    model: "test-model"
  });

  const result = await provider.generate({
    prompt: "Sidee tahay?",
    language: "automatic"
  });

  assert.equal(receivedRequest.input, "Sidee tahay?");
  assert.equal(receivedRequest.model, "test-model");
  assert.match(receivedRequest.instructions, /natural, standard Somali/);
  assert.equal(result.provider, "openai");
  assert.equal(result.text, "Salaan! Sideen kuu caawin karaa?");
});

test("OpenAI provider prioritizes translation requirements over global instructions", async () => {
  let instructions;
  const provider = createOpenAIProvider({
    apiKey: "test-key",
    model: "test-model",
    client: {
      responses: {
        create: async (request) => {
          instructions = request.instructions;
          return { output_text: "Salaan, sidee tahay?" };
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

  assert.match(instructions, /Global developer instructions:\nInclude a detailed explanation\./);
  assert.match(instructions, /Mandatory operation requirements/);
  assert.ok(
    instructions.indexOf("Mandatory operation requirements") >
      instructions.indexOf("Global developer instructions")
  );
  assert.match(instructions, /Return only the translation\./);
});

test("OpenAI provider redacts configured API keys from provider errors", async () => {
  const secret = "FAKE_OPENAI_TEST_KEY";
  const provider = createOpenAIProvider({
    apiKey: secret,
    model: "test-model",
    client: {
      responses: {
        create: async () => {
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

test("OpenAI provider streams text and actual token usage", async () => {
  let receivedRequest;
  const provider = createOpenAIProvider({
    apiKey: "fake-openai-stream-key",
    model: "test-model",
    client: {
      responses: {
        create: async (request, options) => {
          receivedRequest = { request, options };
          return (async function* () {
            yield { type: "response.output_text.delta", delta: "Salaan " };
            yield { type: "response.output_text.delta", delta: "dunida." };
            yield {
              type: "response.completed",
              response: { usage: { input_tokens: 9, output_tokens: 4 } }
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

  assert.equal(receivedRequest.request.stream, true);
  assert.equal(receivedRequest.options.signal, controller.signal);
  assert.deepEqual(chunks.map((chunk) => chunk.text), ["Salaan ", "dunida.", ""]);
  assert.deepEqual(chunks[2].usage, { inputTokens: 9, outputTokens: 4 });
});