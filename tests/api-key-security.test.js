import test from "node:test";
import assert from "node:assert/strict";
import { createGeminiProvider } from "../src/providers/gemini-provider.js";
import { createOpenAIProvider } from "../src/providers/openai-provider.js";

const providers = [
  ["OpenAI", "OPENAI_API_KEY", createOpenAIProvider],
  ["Gemini", "GEMINI_API_KEY", createGeminiProvider]
];

for (const [name, environmentVariable, createProvider] of providers) {
  test(`${name} provider accepts its environment API key without exposing it`, () => {
    const previousValue = process.env[environmentVariable];
    process.env[environmentVariable] = `FAKE_${name.toUpperCase()}_ENV_KEY`;

    try {
      const provider = createProvider({ model: "test-model" });
      assert.deepEqual(Object.keys(provider), ["generate", "stream"]);
      assert.doesNotMatch(provider.generate.toString(), /FAKE_.*_ENV_KEY/);
      assert.doesNotMatch(provider.stream.toString(), /FAKE_.*_ENV_KEY/);
      assert.doesNotMatch(JSON.stringify(provider), /FAKE_.*_ENV_KEY/);
    } finally {
      if (previousValue === undefined) {
        delete process.env[environmentVariable];
      } else {
        process.env[environmentVariable] = previousValue;
      }
    }
  });
}
