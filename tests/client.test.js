import test from "node:test";
import assert from "node:assert/strict";
import { createSomaliAI } from "../src/index.js";
import { createWeydii } from "../src/somali/weydii.js";

test("SDK initializes with default configuration", () => {
  const ai = createSomaliAI();

  assert.equal(ai.getConfig().language, "automatic");
});

test("SDK accepts custom configuration", () => {
  const ai = createSomaliAI({
    provider: "openai",
    model: "test-model"
  });

  assert.equal(ai.getConfig().bixiye, "openai");
  assert.equal(ai.getConfig().moodel, "test-model");
  assert.equal(ai.getConfig().provider, "openai");
  assert.equal(ai.getConfig().model, "test-model");
});

test("SDK does not expose private or unrecognized config values", () => {
  const ai = createSomaliAI({
    provider: "test",
    apiKey: "FAKE_PRIVATE_TEST_KEY",
    OPENAI_API_KEY: "FAKE_ALTERNATE_TEST_KEY",
    systemPrompt: "Always respond professionally in Somali."
  });

  assert.deepEqual(ai.getConfig(), {
    language: "automatic",
    bixiye: "test",
    moodel: null,
    tilmaamo: "Always respond professionally in Somali.",
    provider: "test",
    model: null,
    systemPrompt: "Always respond professionally in Somali.",
    mode: "manual"
  });
  assert.doesNotMatch(JSON.stringify(ai.getConfig()), /FAKE_(PRIVATE|ALTERNATE)_TEST_KEY/);
});

test("SDK validates private keys and global prompt configuration", () => {
  assert.throws(
    () => createSomaliAI({ apiKey: 123 }),
    /furahaAPI \(API key\) must be a non-empty string/
  );
  assert.throws(
    () => createSomaliAI({ systemPrompt: 123 }),
    /tilmaamo \(systemPrompt\) must be a non-empty string/
  );
  assert.throws(
    () => createSomaliAI(null),
    /Configuration options must be an object/
  );
});

test("SDK passes global prompts to all request methods", async () => {
  const requests = [];
  const ai = createSomaliAI({
    provider: "test",
    systemPrompt: "Always respond professionally in Somali."
  });
  ai.providers.register("test", {
    generate: async (request) => {
      requests.push(request);
      return { text: "Salaan." };
    }
  });

  await ai.weydii("Sidee tahay?");
  await ai.sooKoob("Qoraal dheer");
  await ai.turjun("Hello, how are you?", "Somali");
  await ai.wadaSheekeysi("Aan wada hadalno");

  assert.equal(requests.length, 4);
  for (const request of requests) {
    assert.equal(request.systemPrompt, "Always respond professionally in Somali.");
  }
  assert.match(requests[2].operationInstructions, /Return only the translated text/);
});

test("SDK starts with no registered providers", () => {
  const ai = createSomaliAI();

  assert.deepEqual(ai.getProviders(), []);
});

test("SDK registers and retrieves a provider", () => {
  const ai = createSomaliAI();

  const testProvider = {
    generate: async () => ({
      text: "Salaan!"
    })
  };

  ai.providers.register("test", testProvider);

  assert.deepEqual(ai.getProviders(), ["test"]);

  assert.equal(
    ai.providers.get("test"),
    testProvider
  );
});

test("weydii sends a question to the provider", async () => {
  let receivedRequest;

  const fakeProvider = {
    generate: async (request) => {
      receivedRequest = request;

      return {
        text: "Salaan! Sideen kuu caawin karaa?"
      };
    }
  };

  const weydii = createWeydii(fakeProvider);

  const result = await weydii("Sidee tahay?");

  assert.equal(
    receivedRequest.prompt,
    "Sidee tahay?"
  );

  assert.equal(
    receivedRequest.language,
    "automatic"
  );

  assert.equal(
    result.text,
    "Salaan! Sideen kuu caawin karaa?"
  );
});

test("weydii rejects an empty question", async () => {
  const fakeProvider = {
    generate: async () => ({ text: "Hello" })
  };

  const weydii = createWeydii(fakeProvider);

  await assert.rejects(
    () => weydii(""),
    /valid question/
  );
});

test("SDK exposes weydii through the main client", async () => {
  const ai = createSomaliAI({
    provider: "test"
  });

  ai.providers.register("test", {
    generate: async ({ prompt }) => ({
      text: `You asked: ${prompt}`
    })
  });

  const result = await ai.weydii("Sidee tahay?");

  assert.equal(
    result.text,
    "You asked: Sidee tahay?"
  );
});