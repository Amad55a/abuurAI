import test from "node:test";
import assert from "node:assert/strict";
import { createSomaliAI } from "../src/index.js";
import { createAnthropicProvider } from "../src/providers/anthropic-provider.js";
import { createMistralProvider } from "../src/providers/mistral-provider.js";
import { createDeepSeekProvider } from "../src/providers/deepseek-provider.js";
import { createCohereProvider } from "../src/providers/cohere-provider.js";
import { createXAIProvider } from "../src/providers/xai-provider.js";

const providers = [
  {
    name: "Anthropic",
    identifier: "anthropic",
    environmentVariable: "ANTHROPIC_API_KEY",
    create: createAnthropicProvider,
    endpoint: "https://api.anthropic.com/v1/messages",
    response: { content: [{ type: "text", text: "Salaan." }] },
    getText: (request) => request.content,
    streamBody: [
      { type: "content_block_delta", delta: { text: "Salaan " } },
      { type: "content_block_delta", delta: { text: "dunida." } }
    ].map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""),
    assertRequest(request, apiKey) {
      assert.equal(request.headers["x-api-key"], apiKey);
      assert.equal(request.headers["anthropic-version"], "2023-06-01");
      assert.equal(request.payload.max_tokens, 1024);
      assert.equal(request.payload.messages[0].role, "user");
      assert.match(request.payload.system, /Custom Somali instructions/);
    }
  },
  {
    name: "Mistral",
    identifier: "mistral",
    environmentVariable: "MISTRAL_API_KEY",
    create: createMistralProvider,
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    response: { choices: [{ message: { content: "Salaan." } }] },
    getText: (request) => request.choices[0].message.content,
    streamBody: [
      { choices: [{ delta: { content: "Salaan " } }] },
      { choices: [{ delta: { content: "dunida." } }] }
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n",
    assertRequest(request, apiKey) {
      assert.equal(request.headers.authorization, `Bearer ${apiKey}`);
      assert.equal(request.payload.messages[0].role, "system");
      assert.match(request.payload.messages[0].content, /Custom Somali instructions/);
    }
  },
  {
    name: "DeepSeek",
    identifier: "deepseek",
    environmentVariable: "DEEPSEEK_API_KEY",
    create: createDeepSeekProvider,
    endpoint: "https://api.deepseek.com/chat/completions",
    response: { choices: [{ message: { content: "Salaan." } }] },
    getText: (request) => request.choices[0].message.content,
    streamBody: [
      { choices: [{ delta: { content: "Salaan " } }] },
      { choices: [{ delta: { content: "dunida." } }] }
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n",
    assertRequest(request, apiKey) {
      assert.equal(request.headers.authorization, `Bearer ${apiKey}`);
      assert.equal(request.payload.messages[0].role, "system");
      assert.match(request.payload.messages[0].content, /Custom Somali instructions/);
    }
  },
  {
    name: "Cohere",
    identifier: "cohere",
    environmentVariable: "COHERE_API_KEY",
    create: createCohereProvider,
    endpoint: "https://api.cohere.com/v2/chat",
    response: { message: { content: [{ type: "text", text: "Salaan." }] } },
    getText: (request) => request.message.content[0].text,
    streamBody: [
      { type: "content-delta", delta: { message: { content: { text: "Salaan " } } } },
      { type: "content-delta", delta: { message: { content: { text: "dunida." } } } }
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n",
    assertRequest(request, apiKey) {
      assert.equal(request.headers.authorization, `Bearer ${apiKey}`);
      assert.equal(request.payload.messages[0].role, "system");
      assert.match(request.payload.messages[0].content, /Custom Somali instructions/);
    }
  },
  {
    name: "xAI",
    identifier: "xai",
    environmentVariable: "XAI_API_KEY",
    create: createXAIProvider,
    endpoint: "https://api.x.ai/v1/chat/completions",
    response: { choices: [{ message: { content: "Salaan." } }] },
    getText: (request) => request.choices[0].message.content,
    streamBody: [
      { choices: [{ delta: { content: "Salaan " } }] },
      { choices: [{ delta: { content: "dunida." } }] }
    ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n",
    assertRequest(request, apiKey) {
      assert.equal(request.headers.authorization, `Bearer ${apiKey}`);
      assert.equal(request.payload.messages[0].role, "system");
      assert.match(request.payload.messages[0].content, /Custom Somali instructions/);
    }
  }
];

function fakeResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}

for (const provider of providers) {
  test(`${provider.name} initializes with explicit API key and configured model`, () => {
    assert.throws(
      () => provider.create({ model: "test-model" }),
      /API key is required/
    );
    assert.throws(
      () => provider.create({ apiKey: "test-key" }),
      /specify a .* model/
    );
    assert.throws(
      () => provider.create({ apiKey: " ", model: "test-model" }),
      /API key must be a non-empty string/
    );
    assert.throws(
      () => provider.create({ apiKey: "test-key", model: " " }),
      /specify a .* model/
    );
  });

  test(`${provider.name} uses its API endpoint and maps generated text`, async () => {
    const apiKey = `FAKE_${provider.identifier.toUpperCase()}_KEY`;
    let request;
    const ai = createSomaliAI({
      provider: provider.identifier,
      apiKey,
      model: "configured-test-model",
      systemPrompt: "Custom Somali instructions.",
      fetch: async (url, options) => {
        request = {
          url,
          headers: options.headers,
          payload: JSON.parse(options.body)
        };
        return fakeResponse(200, provider.response);
      }
    });

    const result = await ai.weydii("Sidee tahay?");

    assert.equal(request.url, provider.endpoint);
    assert.equal(request.payload.model, "configured-test-model");
    provider.assertRequest(request, apiKey);
    assert.equal(result.text, "Salaan.");
    assert.equal(result.provider, provider.identifier);
    assert.equal(result.model, "configured-test-model");
    assert.equal(ai.getProviders().includes(provider.identifier), true);
    assert.doesNotMatch(JSON.stringify(ai.getConfig()), new RegExp(apiKey));
    assert.doesNotMatch(JSON.stringify(result), new RegExp(apiKey));
  });

  test(`${provider.name} supports Somali text operations`, async () => {
    let request;
    const ai = createSomaliAI({
      provider: provider.identifier,
      apiKey: "fake-somali-operations-key",
      model: "configured-test-model",
      systemPrompt: "Custom Somali instructions.",
      fetch: async (url, options) => {
        request = {
          url,
          headers: options.headers,
          payload: JSON.parse(options.body)
        };
        return fakeResponse(200, provider.response);
      }
    });

    const result = await ai.turjun("Hello", "Somali");

    assert.equal(result.text, "Salaan.");
    if (provider.identifier === "anthropic") {
      assert.match(request.payload.system, /Return only the translated text/);
      assert.equal(request.payload.messages[0].content, "Translate the following text accurately and naturally into Somali.\nFor Somali, use natural, standard Somali spelling and grammar. For example, translate \"Hello, how are you?\" as \"Salaan, sidee tahay?\"; do not use misspellings such as \"Silamaha\".\nReturn only the translated text. Do not include an explanation, introduction, notes, or alternative translations.\n\nText:\nHello");
    } else {
      assert.match(request.payload.messages[0].content, /Return only the translated text/);
      assert.match(request.payload.messages[0].content, /Custom/);
    }
  });

  test(`${provider.name} maps authentication, rate limit, network, and provider errors`, async () => {
    const apiKey = `FAKE_${provider.identifier.toUpperCase()}_ERROR_KEY`;
    const makeProvider = (fetch) => provider.create({
      apiKey,
      model: "configured-test-model",
      fetch
    });

    await assert.rejects(
      () => makeProvider(async () => fakeResponse(401, { message: `Invalid key ${apiKey}` }))
        .generate({ prompt: "Test" }),
      (error) => {
        assert.match(error.message, /Invalid API key/);
        assert.doesNotMatch(error.message, new RegExp(apiKey));
        return true;
      }
    );

    await assert.rejects(
      () => makeProvider(async () => fakeResponse(429, { message: "Too many requests" }))
        .generate({ prompt: "Test" }),
      /API limit or credits exceeded/
    );

    await assert.rejects(
      () => makeProvider(async () => {
        throw new TypeError("fetch failed");
      }).generate({ prompt: "Test" }),
      /Network connection failed/
    );

    await assert.rejects(
      () => makeProvider(async () => fakeResponse(500, {
        error: { message: `Provider failure ${apiKey}` }
      })).generate({ prompt: "Test" }),
      (error) => {
        assert.match(error.message, /Provider failure \[REDACTED\]/);
        assert.doesNotMatch(error.message, new RegExp(apiKey));
        return true;
      }
    );
  });

  test(`${provider.name} uses its environment API key`, async () => {
    const previousKey = process.env[provider.environmentVariable];
    process.env[provider.environmentVariable] = "FAKE_ENVIRONMENT_KEY";

    try {
      const instance = provider.create({
        model: "configured-test-model",
        fetch: async () => fakeResponse(200, provider.response)
      });
      const result = await instance.generate({ prompt: "Test" });
      assert.equal(result.model, "configured-test-model");
    } finally {
      if (previousKey === undefined) {
        delete process.env[provider.environmentVariable];
      } else {
        process.env[provider.environmentVariable] = previousKey;
      }
    }
  });

  test(`${provider.name} streams normalized text using its official API shape`, async () => {
    let request;
    const apiKey = "fake-stream-test-key";
    const instance = provider.create({
      apiKey,
      model: "configured-test-model",
      fetch: async (url, options) => {
        request = {
          url,
          headers: options.headers,
          payload: JSON.parse(options.body),
          signal: options.signal
        };
        return new Response(provider.streamBody, {
          headers: { "content-type": "text/event-stream" }
        });
      }
    });

    const chunks = [];
    for await (const chunk of instance.stream({
      prompt: "Explain AI",
      language: "Somali",
      systemPrompt: "Global Somali instruction",
      signal: new AbortController().signal
    })) {
      chunks.push(chunk.text);
    }

    assert.equal(request.url, provider.endpoint);
    assert.equal(request.payload.model, "configured-test-model");
    assert.equal(request.payload.stream, true);
    assert.ok(request.signal);
    assert.deepEqual(chunks, ["Salaan ", "dunida."]);
  });
}

test("fetch-based provider streams support AbortSignal cancellation", async () => {
  const provider = createMistralProvider({
    apiKey: "fake-abort-key",
    model: "mistral-model",
    fetch: async () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content: "First" } }] })}\n\n`
        ));
      }
    }), {
      headers: { "content-type": "text/event-stream" }
    })
  });
  const controller = new AbortController();
  const iterator = provider.stream({
    prompt: "Prompt",
    signal: controller.signal
  });

  assert.equal((await iterator.next()).value.text, "First");
  controller.abort();
  await assert.rejects(() => iterator.next(), { name: "AbortError" });
});

test("fetch-based provider streaming maps connection interruptions", async () => {
  const provider = createDeepSeekProvider({
    apiKey: "fake-network-key",
    model: "deepseek-model",
    fetch: async () => {
      throw new TypeError("fetch failed");
    }
  });

  await assert.rejects(async () => {
    for await (const _chunk of provider.stream({ prompt: "Prompt" })) {}
  }, /Network connection failed/);
});
