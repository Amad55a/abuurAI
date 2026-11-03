import test from "node:test";
import assert from "node:assert/strict";
import { abuurAI } from "../src/index.js";
import { createOpenRouterProvider } from "../src/providers/openrouter-provider.js";
import { createOllamaProvider } from "../src/providers/ollama-provider.js";
import { createPerplexityProvider } from "../src/providers/perplexity-provider.js";
import { createMetaProvider } from "../src/providers/meta-provider.js";
import { createNvidiaProvider } from "../src/providers/nvidia-provider.js";

// --- Shared helpers ---

function fakeResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}

const chatCompletionResponse = { choices: [{ message: { content: "Salaan." } }] };
const streamBody = [
  { choices: [{ delta: { content: "Salaan " } }] },
  { choices: [{ delta: { content: "dunida." } }] }
].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";

// --- Standard providers (OpenRouter, Perplexity, Meta, NVIDIA) ---

const standardProviders = [
  {
    name: "OpenRouter",
    identifier: "openrouter",
    environmentVariable: "OPENROUTER_API_KEY",
    create: createOpenRouterProvider,
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    response: chatCompletionResponse,
    streamBody,
    assertRequest(request, apiKey) {
      assert.equal(request.headers.authorization, `Bearer ${apiKey}`);
      assert.equal(request.payload.messages[0].role, "system");
      assert.match(request.payload.messages[0].content, /Custom Somali instructions/);
    }
  },
  {
    name: "Perplexity",
    identifier: "perplexity",
    environmentVariable: "PERPLEXITY_API_KEY",
    create: createPerplexityProvider,
    endpoint: "https://api.perplexity.ai/chat/completions",
    response: chatCompletionResponse,
    streamBody,
    assertRequest(request, apiKey) {
      assert.equal(request.headers.authorization, `Bearer ${apiKey}`);
      assert.equal(request.payload.messages[0].role, "system");
      assert.match(request.payload.messages[0].content, /Custom Somali instructions/);
    }
  },
  {
    name: "Meta",
    identifier: "meta",
    environmentVariable: "META_API_KEY",
    create: createMetaProvider,
    endpoint: "https://api.meta.ai/v1/chat/completions",
    response: chatCompletionResponse,
    streamBody,
    assertRequest(request, apiKey) {
      assert.equal(request.headers.authorization, `Bearer ${apiKey}`);
      assert.equal(request.payload.messages[0].role, "system");
      assert.match(request.payload.messages[0].content, /Custom Somali instructions/);
    }
  },
  {
    name: "NVIDIA",
    identifier: "nvidia",
    environmentVariable: "NVIDIA_API_KEY",
    create: createNvidiaProvider,
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    response: chatCompletionResponse,
    streamBody,
    assertRequest(request, apiKey) {
      assert.equal(request.headers.authorization, `Bearer ${apiKey}`);
      assert.equal(request.payload.messages[0].role, "system");
      assert.match(request.payload.messages[0].content, /Custom Somali instructions/);
    }
  }
];

// --- Tests for standard providers ---

for (const provider of standardProviders) {
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
    const ai = abuurAI({
      bixiye: provider.identifier,
      furahaAPI: apiKey,
      moodel: "configured-test-model",
      tilmaamo: "Custom Somali instructions.",
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
    const ai = abuurAI({
      bixiye: provider.identifier,
      furahaAPI: "fake-somali-operations-key",
      moodel: "configured-test-model",
      tilmaamo: "Custom Somali instructions.",
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
    assert.match(request.payload.messages[0].content, /Return only the translated text/);
    assert.match(request.payload.messages[0].content, /Custom/);
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

// --- Ollama-specific tests ---

test("Ollama initializes with model and optional API key", () => {
  assert.throws(
    () => createOllamaProvider({ apiKey: "test-key" }),
    /specify an Ollama model/
  );
  assert.throws(
    () => createOllamaProvider({ model: " " }),
    /specify an Ollama model/
  );
  assert.throws(
    () => createOllamaProvider({ apiKey: " ", model: "llama3.2" }),
    /API key must be a non-empty string/
  );
  // Ollama should NOT require an API key
  const instance = createOllamaProvider({
    model: "llama3.2",
    fetch: async () => fakeResponse(200, chatCompletionResponse)
  });
  assert.ok(instance.generate);
  assert.ok(instance.stream);
});

test("Ollama uses default local endpoint", async () => {
  let request;
  const ai = abuurAI({
    bixiye: "ollama",
    moodel: "llama3.2",
    fetch: async (url, options) => {
      request = {
        url,
        headers: options.headers,
        payload: JSON.parse(options.body)
      };
      return fakeResponse(200, chatCompletionResponse);
    }
  });

  await ai.weydii("Hello");

  assert.equal(request.url, "http://localhost:11434/v1/chat/completions");
  assert.equal(request.payload.model, "llama3.2");
});

test("Ollama supports cinwaankaAPI endpoint alias", async () => {
  let request;
  const ai = abuurAI({
    bixiye: "ollama",
    moodel: "llama3.2",
    cinwaankaAPI: "http://my-ollama:11434/v1",
    fetch: async (url, options) => {
      request = {
        url,
        headers: options.headers,
        payload: JSON.parse(options.body)
      };
      return fakeResponse(200, chatCompletionResponse);
    }
  });

  await ai.weydii("Hello");

  assert.equal(request.url, "http://my-ollama:11434/v1/chat/completions");
});

test("Ollama supports custom endpoint property", async () => {
  let request;
  const instance = createOllamaProvider({
    model: "llama3.2",
    endpoint: "http://remote-ollama:8080/v1",
    fetch: async (url, options) => {
      request = { url, headers: options.headers, payload: JSON.parse(options.body) };
      return fakeResponse(200, chatCompletionResponse);
    }
  });

  await instance.generate({ prompt: "Test" });

  assert.equal(request.url, "http://remote-ollama:8080/v1/chat/completions");
});

test("Ollama normalizes endpoints correctly", async () => {
  const testEndpoints = [
    ["http://localhost:11434", "http://localhost:11434/v1/chat/completions"],
    ["http://localhost:11434/v1", "http://localhost:11434/v1/chat/completions"],
    ["http://localhost:11434/v1/chat/completions", "http://localhost:11434/v1/chat/completions"],
    ["http://localhost:11434/", "http://localhost:11434/v1/chat/completions"],
    ["http://localhost:11434/v1/", "http://localhost:11434/v1/chat/completions"]
  ];

  for (const [input, expected] of testEndpoints) {
    let request;
    const instance = createOllamaProvider({
      model: "llama3.2",
      endpoint: input,
      fetch: async (url, options) => {
        request = { url };
        return fakeResponse(200, chatCompletionResponse);
      }
    });
    await instance.generate({ prompt: "Test" });
    assert.equal(request.url, expected, `Endpoint ${input} should normalize to ${expected}`);
  }
});

test("Ollama sends no authorization header when no API key is provided", async () => {
  let request;
  const instance = createOllamaProvider({
    model: "llama3.2",
    fetch: async (url, options) => {
      request = { url, headers: options.headers };
      return fakeResponse(200, chatCompletionResponse);
    }
  });

  await instance.generate({ prompt: "Test" });

  assert.equal(request.headers.authorization, undefined);
});

test("Ollama sends authorization header when API key is provided", async () => {
  let request;
  const instance = createOllamaProvider({
    model: "llama3.2",
    apiKey: "ollama-cloud-key",
    fetch: async (url, options) => {
      request = { url, headers: options.headers };
      return fakeResponse(200, chatCompletionResponse);
    }
  });

  await instance.generate({ prompt: "Test" });

  assert.equal(request.headers.authorization, "Bearer ollama-cloud-key");
});

test("Ollama uses OLLAMA_ENDPOINT environment variable", async () => {
  const previous = process.env.OLLAMA_ENDPOINT;
  process.env.OLLAMA_ENDPOINT = "http://env-host:11434/v1";

  try {
    let request;
    const instance = createOllamaProvider({
      model: "llama3.2",
      fetch: async (url, options) => {
        request = { url };
        return fakeResponse(200, chatCompletionResponse);
      }
    });
    await instance.generate({ prompt: "Test" });
    assert.equal(request.url, "http://env-host:11434/v1/chat/completions");
  } finally {
    if (previous === undefined) {
      delete process.env.OLLAMA_ENDPOINT;
    } else {
      process.env.OLLAMA_ENDPOINT = previous;
    }
  }
});

test("Ollama uses OLLAMA_API_KEY environment variable", async () => {
  const previousKey = process.env.OLLAMA_API_KEY;
  process.env.OLLAMA_API_KEY = "env-ollama-key";

  try {
    let request;
    const instance = createOllamaProvider({
      model: "llama3.2",
      fetch: async (url, options) => {
        request = { url, headers: options.headers };
        return fakeResponse(200, chatCompletionResponse);
      }
    });
    await instance.generate({ prompt: "Test" });
    assert.equal(request.headers.authorization, "Bearer env-ollama-key");
  } finally {
    if (previousKey === undefined) {
      delete process.env.OLLAMA_API_KEY;
    } else {
      process.env.OLLAMA_API_KEY = previousKey;
    }
  }
});

test("Ollama Somali text operations work without API key", async () => {
  let request;
  const ai = abuurAI({
    bixiye: "ollama",
    moodel: "llama3.2",
    tilmaamo: "Custom Somali instructions.",
    fetch: async (url, options) => {
      request = {
        url,
        headers: options.headers,
        payload: JSON.parse(options.body)
      };
      return fakeResponse(200, chatCompletionResponse);
    }
  });

  const result = await ai.turjun("Hello", "Somali");

  assert.equal(result.text, "Salaan.");
  assert.match(request.payload.messages[0].content, /Return only the translated text/);
  assert.match(request.payload.messages[0].content, /Custom/);
});

test("Ollama streams normalized text", async () => {
  let request;
  const instance = createOllamaProvider({
    model: "llama3.2",
    fetch: async (url, options) => {
      request = {
        url,
        headers: options.headers,
        payload: JSON.parse(options.body),
        signal: options.signal
      };
      return new Response(streamBody, {
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

  assert.equal(request.url, "http://localhost:11434/v1/chat/completions");
  assert.equal(request.payload.model, "llama3.2");
  assert.equal(request.payload.stream, true);
  assert.ok(request.signal);
  assert.deepEqual(chunks, ["Salaan ", "dunida."]);
});

test("Ollama streaming sends no auth header when no API key is provided", async () => {
  let request;
  const instance = createOllamaProvider({
    model: "llama3.2",
    fetch: async (url, options) => {
      request = { url, headers: options.headers };
      return new Response(streamBody, {
        headers: { "content-type": "text/event-stream" }
      });
    }
  });

  for await (const _chunk of instance.stream({ prompt: "Test" })) {}

  assert.equal(request.headers.authorization, undefined);
});

test("Ollama maps network errors", async () => {
  const instance = createOllamaProvider({
    model: "llama3.2",
    fetch: async () => {
      throw new TypeError("fetch failed");
    }
  });

  await assert.rejects(
    () => instance.generate({ prompt: "Test" }),
    /Network connection failed/
  );
});

// --- Integration: new providers are accessible ---

test("abuurAI() can initialize each new provider", async () => {
  const newProviders = [
    { id: "openrouter", model: "openai/gpt-4o", apiKey: "fake-openrouter-key" },
    { id: "ollama", model: "llama3.2" },
    { id: "perplexity", model: "sonar", apiKey: "fake-perplexity-key" },
    { id: "meta", model: "llama-3.3-70b", apiKey: "fake-meta-key" },
    {
      id: "nvidia",
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      apiKey: "fake-nvidia-key"
    }
  ];

  for (const { id, model, apiKey } of newProviders) {
    const ai = abuurAI({
      bixiye: id,
      ...(apiKey ? { furahaAPI: apiKey } : {}),
      moodel: model,
      fetch: async () => fakeResponse(200, chatCompletionResponse)
    });
    assert.equal(ai.getProviders().includes(id), true, `Provider '${id}' should be registered`);
    const result = await ai.weydii("Hello");
    assert.equal(result.text, "Salaan.");
    assert.equal(result.provider, id);
    assert.equal(result.model, model);
  }
});

// --- cinwaankaAPI alias in configuration ---

test("cinwaankaAPI alias is passed through to provider", async () => {
  let request;
  const ai = abuurAI({
    bixiye: "openrouter",
    furahaAPI: "fake-key",
    moodel: "openai/gpt-4o",
    cinwaankaAPI: "https://custom-openrouter.example.com/v1/chat/completions",
    fetch: async (url, options) => {
      request = { url };
      return fakeResponse(200, chatCompletionResponse);
    }
  });

  await ai.weydii("Hello");
  assert.equal(request.url, "https://custom-openrouter.example.com/v1/chat/completions");
});

// --- API key safety ---

test("new providers do not leak API keys in errors", async () => {
  for (const [create, name] of [
    [createOpenRouterProvider, "OpenRouter"],
    [createPerplexityProvider, "Perplexity"],
    [createMetaProvider, "Meta"],
    [createNvidiaProvider, "NVIDIA"]
  ]) {
    const apiKey = `SECRET_${name.toUpperCase()}_KEY_12345`;
    const instance = create({
      apiKey,
      model: "test-model",
      fetch: async () => fakeResponse(500, {
        error: { message: `Internal error with key ${apiKey}` }
      })
    });

    await assert.rejects(
      () => instance.generate({ prompt: "Test" }),
      (error) => {
        assert.doesNotMatch(error.message, new RegExp(apiKey),
          `${name} should not leak API key in error messages`);
        return true;
      }
    );
  }
});

test("Ollama does not leak API key in errors when key is provided", async () => {
  const apiKey = "SECRET_OLLAMA_KEY_12345";
  const instance = createOllamaProvider({
    apiKey,
    model: "llama3.2",
    fetch: async () => fakeResponse(500, {
      error: { message: `Internal error with key ${apiKey}` }
    })
  });

  await assert.rejects(
    () => instance.generate({ prompt: "Test" }),
    (error) => {
      assert.doesNotMatch(error.message, new RegExp(apiKey),
        "Ollama should not leak API key in error messages");
      return true;
    }
  );
});
