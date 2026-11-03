import test from "node:test";
import assert from "node:assert/strict";
import { abuurAI } from "../src/browser.js";

const cloudflareModel = "google/gemini-2.5-flash";
const localEndpoint = "http://localhost:8787/api/somali-ai";

function response(status, payload) {
  return Response.json(payload, { status });
}

test('gateway: "connected" defaults to the same-origin trusted Worker route', async () => {
  let requestUrl;
  let requestOptions;
  const ai = abuurAI({
    bixiye: "gemini",
    gateway: "connected",
    fetch: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return response(200, {
        text: "Jawaab.",
        provider: "gemini",
        model: cloudflareModel
      });
    }
  });

  assert.equal(ai.getConfig().gateway, "connected");
  assert.equal(ai.getConfig().gatewayEndpoint, "/api/somali-ai");
  assert.equal((await ai.weydii("Salaan!")).text, "Jawaab.");
  assert.equal(requestUrl, "/api/somali-ai");
  assert.equal(requestOptions.method, "POST");
  assert.deepEqual(JSON.parse(requestOptions.body), {
    provider: "gemini",
    model: cloudflareModel,
    prompt: "Salaan!",
    instructions: "Respond in the same language as the user's message. For Somali responses, use natural, standard Somali spelling and grammar."
  });
  assert.equal(new Headers(requestOptions.headers).has("authorization"), false);
  assert.doesNotMatch(requestOptions.body, /apiKey|token|secret|accountId|gatewayId/i);
});

test("connected Gateway maps configurable Gemini models and keeps the normal result shape", async () => {
  let body;
  const ai = abuurAI({
    bixiye: "gemini",
    providers: { gemini: { moodel: "gemini-2.5-pro" } },
    gateway: "connected",
    gatewayEndpoint: localEndpoint,
    tilmaamo: "Answer in Somali.",
    fetch: async (_url, options) => {
      body = JSON.parse(options.body);
      return response(200, {
        text: "Jawaab.",
        model: cloudflareModel
      });
    }
  });

  assert.deepEqual(await ai.weydii("Salaan!"), {
    text: "Jawaab.",
    provider: "gemini",
    model: "gemini-2.5-pro"
  });
  assert.equal(body.model, "google/gemini-2.5-pro");
  assert.match(body.instructions, /Answer in Somali/);
});

test("connected Gateway rejects unsupported, unsafe, or conflicting configuration", () => {
  assert.throws(() => abuurAI({ gateway: true }), /Cloudflare gateway configuration object/);
  assert.throws(() => abuurAI({
    bixiye: "openai",
    gateway: "connected"
  }), /only the Gemini provider/);
  assert.throws(() => abuurAI({
    bixiye: "gemini",
    furahaAPI: "must-not-be-used",
    gateway: "connected"
  }), /Do not configure a Gemini API key/);
  assert.throws(() => abuurAI({
    bixiye: "gemini",
    mode: "auto",
    gateway: "connected"
  }), /does not support automatic provider selection/);
  assert.throws(() => abuurAI({
    gateway: "connected",
    gatewayEndpoint: "http://remote.example/api/somali-ai"
  }), /must use HTTPS/);
  assert.throws(() => abuurAI({
    gateway: "connected",
    gatewayEndpoint: "//remote.example/api/somali-ai"
  }), /valid absolute URL/);
  assert.throws(() => abuurAI({
    gateway: "connected",
    gatewayEndpoint: "/api/somali-ai?token=bad"
  }), /without a query or fragment/);
  assert.throws(() => abuurAI({
    gateway: "connected",
    gatewayEndpoint: "/other"
  }), /same-origin \/api\/ path/);
});

test("connected Gateway surfaces Worker errors and malformed responses", async () => {
  const failed = abuurAI({
    gateway: "connected",
    fetch: async () => response(502, { error: "Gateway inference failed." })
  });
  await assert.rejects(failed.weydii("Salaan!"), /Gateway inference failed/);

  const malformed = abuurAI({
    gateway: "connected",
    fetch: async () => new Response("not JSON")
  });
  await assert.rejects(malformed.weydii("Salaan!"), /invalid JSON/);

  const noText = abuurAI({
    gateway: "connected",
    fetch: async () => response(200, { text: " " })
  });
  await assert.rejects(noText.weydii("Salaan!"), /no text response/);
});

test("connected Gateway reports a bounded timeout and supports caller aborts", async () => {
  const hanging = abuurAI({
    gateway: "connected",
    gatewayTimeoutMs: 5,
    fetch: async () => new Promise(() => {})
  });
  await assert.rejects(
    hanging.weydii("Salaan!"),
    /timed out after 5 ms/
  );

  const controller = new AbortController();
  const aborted = abuurAI({
    gateway: "connected",
    fetch: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true }
      );
    })
  });
  const request = aborted.weydii("Salaan!", { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, /request was aborted/);
});
