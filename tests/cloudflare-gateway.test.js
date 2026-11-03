import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSomaliAI } from "../src/index.js";
import { createSomaliAI as createBrowserSomaliAI } from "../src/browser.js";
import worker from "../templates/cloudflare-ai-gateway/src/index.js";

const gateway = {
  type: "cloudflare",
  accountId: "0123456789abcdef0123456789abcdef",
  gatewayId: "somali-ai",
  endpoint: "https://ai.example.workers.dev/"
};

function createResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

test("Cloudflare gateway validates its configuration", () => {
  for (const invalid of [
    null,
    {},
    { ...gateway, type: "other" },
    { ...gateway, accountId: "account" },
    { ...gateway, gatewayId: "" },
    { ...gateway, endpoint: "not a URL" },
    { ...gateway, endpoint: "http://ai.example.workers.dev" },
    { ...gateway, endpoint: "https://user:pass@ai.example.workers.dev" },
    { ...gateway, endpoint: "https://ai.example.workers.dev?token=x" }
  ]) {
    assert.throws(() => createSomaliAI({ gateway: invalid }));
  }

  assert.doesNotThrow(() => createSomaliAI({
    provider: "gemini",
    model: "gemini-2.5-flash",
    gateway
  }));
  assert.doesNotThrow(() => createSomaliAI({
    gateway: { ...gateway, endpoint: "http://localhost:8787" }
  }));
});

test("gateway mode configures automatic provider selection without direct keys", () => {
  const ai = createSomaliAI({
    mode: "auto",
    gateway,
    providers: {
      gemini: { model: "gemini-2.5-flash" },
      openai: { model: "gpt-4.1-mini" }
    }
  });
  assert.deepEqual(ai.getConfig().configuredProviders, ["gemini", "openai"]);
  assert.equal(ai.doorModel({ task: "conversation" }).provider, "gemini");
});

test("SDK can select OpenRouter and Gemini through the same Cloudflare gateway client", async () => {
  const calls = [];
  const ai = createSomaliAI({
    provider: "gemini",
    model: "gemini-2.5-flash",
    gateway,
    providers: {
      openrouter: { model: "openai/gpt-4o-mini" }
    },
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body);
      return createResponse(200, {
        text: `response for ${body.provider}`,
        provider: body.provider,
        model: body.model
      });
    }
  });

  assert.equal((await ai.weydii("Salaan!")).provider, "gemini");
  assert.equal(
    (await ai.weydii("Salaan!", { provider: "openrouter" })).provider,
    "openrouter"
  );
  assert.deepEqual(calls.map(({ provider, model }) => ({ provider, model })), [
    { provider: "gemini", model: "gemini-2.5-flash" },
    {
      provider: "openrouter",
      model: "openai/gpt-4o-mini"
    }
  ]);
  assert.equal(ai.getProviders().includes("openrouter"), true);
});

test("OpenRouter is available only through the Cloudflare gateway", async () => {
  const direct = createSomaliAI({
    provider: "openrouter",
    model: "provider/model"
  });
  await assert.rejects(
    () => direct.weydii("Hello"),
    /only through Cloudflare gateway mode/
  );
  assert.doesNotThrow(() => createSomaliAI({
    provider: "openrouter",
    model: "provider/model:free",
    gateway
  }));
  assert.throws(() => createSomaliAI({
    provider: "gemini",
    model: "gemini-2.5-flash",
    providers: {
      openrouter: {
        model: "provider/model",
        apiKey: "must-not-be-in-sdk-config"
      }
    },
    gateway
  }), /configured server-side on the Cloudflare Worker/);
});

test("gateway mode sends normalized prompts without provider credentials", async () => {
  let received;
  const ai = createSomaliAI({
    provider: "gemini",
    model: "gemini-2.5-flash",
    gateway,
    apiKey: "must-not-be-sent",
    systemPrompt: "Global Somali instruction.",
    fetch: async (url, options) => {
      received = { url, options, body: JSON.parse(options.body) };
      return createResponse(200, {
        text: "Salaan.",
        provider: "gemini",
        model: "gemini-2.5-flash"
      });
    }
  });

  const result = await ai.turjun("Hello", "Somali");
  assert.equal(received.url, "https://ai.example.workers.dev");
  assert.equal(received.options.method, "POST");
  assert.deepEqual(received.options.headers, { "content-type": "application/json" });
  assert.equal(received.body.accountId, gateway.accountId);
  assert.equal(received.body.gatewayId, gateway.gatewayId);
  assert.equal(received.body.provider, "gemini");
  assert.equal(received.body.model, "gemini-2.5-flash");
  assert.deepEqual(Object.keys(received.body).sort(), [
    "accountId",
    "gatewayId",
    "instructions",
    "model",
    "prompt",
    "provider"
  ]);
  assert.match(received.body.prompt, /Translate the following text/);
  assert.match(received.body.instructions, /Global Somali instruction/);
  assert.match(received.body.instructions, /Return only the translated text/);
  assert.doesNotMatch(received.options.body, /must-not-be-sent/);
  assert.deepEqual(result, {
    text: "Salaan.",
    provider: "gemini",
    model: "gemini-2.5-flash"
  });
  assert.equal(ai.getProviders().includes("gemini"), true);
});

test("gateway request and response errors are explicit", async () => {
  const serverError = createSomaliAI({
    provider: "openai",
    model: "gpt-4.1-mini",
    gateway,
    fetch: async () => createResponse(502, { error: "Gateway unavailable." })
  });
  await assert.rejects(() => serverError.weydii("Hello"), /Gateway unavailable/);

  const malformedResponse = createSomaliAI({
    provider: "openai",
    model: "gpt-4.1-mini",
    gateway,
    fetch: async () => new Response("not JSON", { status: 200 })
  });
  await assert.rejects(() => malformedResponse.weydii("Hello"), /invalid JSON/);

  const emptyResponse = createSomaliAI({
    provider: "openai",
    model: "gpt-4.1-mini",
    gateway,
    fetch: async () => createResponse(200, { text: " " })
  });
  await assert.rejects(() => emptyResponse.weydii("Hello"), /no text response/);

  const unavailable = createSomaliAI({
    provider: "openai",
    model: "gpt-4.1-mini",
    gateway,
    fetch: async () => {
      throw new TypeError("fetch failed");
    }
  });
  await assert.rejects(() => unavailable.weydii("Hello"), /gateway request failed/);
});

test("gateway preserves method surface and rejects unsupported operations explicitly", async () => {
  const ai = createSomaliAI({
    provider: "gemini",
    model: "gemini-2.5-flash",
    gateway,
    fetch: async () => createResponse(200, { text: "OK." })
  });

  for (const method of [
    "weydii", "wadaSheekeysi", "siiWad", "turjun", "sooKoob", "qorCode",
    "falanqeeSawir", "hadalUqor", "sameeEmbedding", "qulqul", "raadsoAqoon"
  ]) {
    assert.equal(typeof ai[method], "function", `${method} remains public`);
  }
  await assert.rejects(
    () => ai.falanqeeSawir({ image: "data:image/png;base64,AA==", prompt: "Describe" }),
    /does not implement the "image-understanding" capability/
  );
  await assert.rejects(
    async () => {
      for await (const _chunk of ai.qulqul({ prompt: "Hello" })) {}
    },
    /Streaming is not supported/
  );
  assert.deepEqual(
    ai.awoodahaModelka({ provider: "gemini" }).providers[0].capabilities,
    ["text-generation", "conversation"]
  );
});

test("browser entry performs gateway requests without Node provider imports", async () => {
  let called = false;
  const ai = createBrowserSomaliAI({
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    gateway,
    fetch: async () => {
      called = true;
      return createResponse(200, { text: "Salaan." });
    }
  });

  assert.equal((await ai.weydii("Hello")).text, "Salaan.");
  assert.equal(called, true);
});

test("beginner browser example loads generated public config and renders the SDK response", async () => {
  const app = await readFile(
    new URL("../examples/browser/app.js", import.meta.url),
    "utf8"
  );
  assert.match(app, /abuurAI,\s*renderSomaliPromptTemplate,\s*somaliPromptTemplates\s*} from "\.\.\/\.\.\/src\/browser\.js"/);
  assert.match(app, /import \{ browserConfig \} from "\.\/config\.js"/);
  assert.match(app, /abuurAI\(browserConfig\)/);
  assert.match(app, /await ai\.weydii\(requestPrompt, \{ bixiye: "openrouter" \}\)/);
  assert.match(app, /renderSomaliPromptTemplate\(promptTemplate\.value/);
  assert.match(app, /answerText\.textContent = result\.text/);
  assert.match(app, /submitButton\.disabled = true/);
  assert.match(app, /errorText\.textContent/);
  assert.doesNotMatch(app, /CF_AIG_TOKEN|OPENROUTER_API_KEY|Authorization|cf-aig-authorization/i);
});

test("browser SDK request reaches Google AI Studio through the Worker", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCall;
  let browserRequestBody;
  const ai = createBrowserSomaliAI({
    provider: "gemini",
    model: "gemini-2.5-flash",
    gateway: {
      ...gateway,
      endpoint: "http://localhost:8787"
    },
    fetch: async (url, options) => {
      browserRequestBody = options.body;
      return worker.fetch(new Request(url, {
        ...options,
        headers: {
          ...options.headers,
          origin: "http://localhost:5173"
        }
      }), {
        ACCOUNT_ID: gateway.accountId,
        GATEWAY_ID: gateway.gatewayId,
        ALLOWED_ORIGINS: "http://localhost:5173",
        ALLOWED_MODELS: JSON.stringify({
          gemini: ["gemini-2.5-flash"]
        }),
        ALLOW_UNAUTHENTICATED_INFERENCE: "true",
        CF_AIG_TOKEN: "mock-gateway-token"
      }
    )
    }
  });

  globalThis.fetch = async (...args) => {
    upstreamCall = args;
    return createResponse(200, {
      candidates: [{
        content: { parts: [{ text: "Jawaab mock ah." }] }
      }]
    });
  };
  try {
    assert.deepEqual(await ai.weydii("Salaan!"), {
      text: "Jawaab mock ah.",
      provider: "gemini",
      model: "gemini-2.5-flash"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(String(upstreamCall[0]), /\/google-ai-studio\/v1\/models\/gemini-2\.5-flash:generateContent$/);
  assert.equal(
    upstreamCall[1].headers["cf-aig-authorization"],
    "Bearer mock-gateway-token"
  );
  assert.equal(upstreamCall[1].headers["x-goog-api-key"], undefined);
  assert.deepEqual(JSON.parse(upstreamCall[1].body).contents, [{
    role: "user",
    parts: [{ text: "Salaan!" }]
  }]);
});

test("browser SDK OpenRouter selection reaches the Worker without exposing secrets", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCall;
  let browserRequestBody;
  let browserRequestHeaders;
  const model = "openai/gpt-4o-mini";
  const ai = createBrowserSomaliAI({
    provider: "openrouter",
    model,
    gateway: { ...gateway, endpoint: "http://localhost:8787" },
    fetch: async (url, options) => {
      browserRequestBody = options.body;
      browserRequestHeaders = options.headers;
      return worker.fetch(
        new Request(url, {
        ...options,
        headers: {
          ...options.headers,
          origin: "http://localhost:5173"
        }
        }),
        {
          ACCOUNT_ID: gateway.accountId,
          GATEWAY_ID: gateway.gatewayId,
          ALLOWED_ORIGINS: "http://localhost:5173",
          ALLOWED_MODELS: JSON.stringify({ openrouter: [model] }),
          ALLOW_UNAUTHENTICATED_INFERENCE: "true",
          CF_AIG_TOKEN: "mock-gateway-token",
          OPENROUTER_BYOK_ALIAS: "cf-aig-byok-alias"
        }
      );
    }
  });

  globalThis.fetch = async (...args) => {
    upstreamCall = args;
    return createResponse(200, {
      choices: [{ message: { content: "Jawaab OpenRouter." } }]
    });
  };
  try {
    assert.deepEqual(await ai.weydii("Salaan!"), {
      text: "Jawaab OpenRouter.",
      provider: "openrouter",
      model
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.match(String(upstreamCall[0]), /\/openrouter\/v1\/chat\/completions$/);
  assert.equal(upstreamCall[1].headers.authorization, undefined);
  assert.equal(upstreamCall[1].headers["cf-aig-authorization"], "Bearer mock-gateway-token");
  assert.equal(upstreamCall[1].headers["cf-aig-byok-alias"], "cf-aig-byok-alias");
  assert.equal(browserRequestHeaders.authorization, undefined);
  assert.equal(browserRequestHeaders["cf-aig-authorization"], undefined);
  assert.doesNotMatch(JSON.stringify(browserRequestHeaders), /mock-gateway-token|api.?key/i);
  const requestBody = JSON.parse(upstreamCall[1].body);
  assert.equal(requestBody.model, model);
  assert.match(requestBody.messages[0].content, /Respond in the same language/);
  assert.deepEqual(requestBody.messages[1], {
    role: "user",
    content: "Salaan!"
  });
  assert.doesNotMatch(browserRequestBody, /mock-gateway-token|cf-aig-byok-alias/);
});
