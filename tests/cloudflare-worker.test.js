import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../templates/cloudflare-ai-gateway/src/index.js";
import {
  MAX_BODY_BYTES,
  readBoundedJson,
  validatePayload
} from "../templates/cloudflare-ai-gateway/src/worker-utils.js";

const origin = "http://localhost:5173";
const wranglerConfig = readFileSync(
  new URL("../templates/cloudflare-ai-gateway/wrangler.toml", import.meta.url),
  "utf8"
);
const env = {
  ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  GATEWAY_ID: "somali-ai",
  CF_AIG_TOKEN: "mock-gateway-token",
  OPENROUTER_BYOK_ALIAS: "cf-aig-byok-alias",
  ALLOWED_ORIGINS: origin,
  ALLOW_UNAUTHENTICATED_INFERENCE: "true",
  ALLOWED_MODELS: JSON.stringify({
    gemini: ["gemini-2.5-flash"],
    openai: ["gpt-4.1-mini"],
    openrouter: ["openai/gpt-4o-mini"]
  }),
  AI: {
    run: async () => ({ response: "Salaan." })
  }
};

function request(body, options = {}) {
  return new Request("http://localhost:8787/", {
    method: options.method || "POST",
    headers: {
      origin,
      "content-type": "application/json",
      ...(options.headers || {})
    },
    ...(body === undefined ? {} : { body })
  });
}

function validPayload(overrides = {}) {
  return {
    accountId: env.ACCOUNT_ID,
    gatewayId: env.GATEWAY_ID,
    provider: "gemini",
    model: "gemini-2.5-flash",
    prompt: "Salaan!",
    instructions: "Respond in Somali.",
    ...overrides
  };
}

async function withMockFetch(fetchMock, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("Worker entry exports only a handler and keeps inference authentication server-side", () => {
  assert.deepEqual(Object.keys(worker), ["fetch"]);
  assert.doesNotMatch(wranglerConfig, /^\[ai\]/m);
  assert.doesNotMatch(wranglerConfig, /^\[env\.development\.ai\]/m);
  for (const name of ["ACCOUNT_ID", "GATEWAY_ID"]) {
    const values = [...wranglerConfig.matchAll(
      new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, "gm")
    )].map((match) => match[1]);
    assert.equal(values.length, 2);
    assert.equal(values[0], values[1], `${name} differs between Wrangler environments.`);
  }
  const workerAccountId = wranglerConfig.match(/^account_id\s*=\s*"([^"]+)"/m)?.[1];
  const gatewayAccountId = wranglerConfig.match(/^ACCOUNT_ID\s*=\s*"([^"]+)"/m)?.[1];
  assert.equal(workerAccountId, gatewayAccountId);
  const openRouterAliases = [...wranglerConfig.matchAll(
    /^OPENROUTER_BYOK_ALIAS\s*=\s*"([^"]+)"/gm
  )].map((match) => match[1]);
  assert.deepEqual(openRouterAliases, ["cf-aig-byok-alias", "cf-aig-byok-alias"]);
  const developmentOrigins = [...wranglerConfig.matchAll(
    /^ALLOWED_ORIGINS\s*=\s*"([^"]+)"/gm
  )].map((match) => match[1]);
  assert.deepEqual(developmentOrigins, ["http://localhost:5173", "http://localhost:5173"]);
  assert.match(wranglerConfig, /\[vars\][\s\S]*?ALLOW_UNAUTHENTICATED_INFERENCE = "false"/);
  assert.match(
    wranglerConfig,
    /\[env\.development\.vars\][\s\S]*?ALLOW_UNAUTHENTICATED_INFERENCE = "true"/
  );
  assert.match(wranglerConfig, /openrouter.*openai\/gpt-4o-mini/);
});

test("Worker validates provider, model, IDs, and text payloads", () => {
  assert.equal(validatePayload(validPayload(), env), null);
  assert.equal(validatePayload(validPayload({
    provider: "openrouter",
    model: "openai/gpt-4o-mini"
  }), env), null);
  for (const invalid of [
    validPayload({ provider: "unknown" }),
    validPayload({ provider: "constructor" }),
    validPayload({ model: "not-allowed" }),
    validPayload({ accountId: "other-account" }),
    validPayload({ gatewayId: "other-gateway" }),
    validPayload({ prompt: "" }),
    validPayload({ instructions: "" }),
    validPayload({ prompt: "x".repeat(24 * 1024 + 1) })
  ]) {
    assert.equal(typeof validatePayload(invalid, env), "string");
  }
});

test("Worker sends OpenAI requests through the configured AI Gateway", async () => {
  let call;
  const response = await withMockFetch(async (...args) => {
    call = args;
    return Response.json({
      choices: [{ message: { content: "Salaan." } }]
    });
  }, () => worker.fetch(request(JSON.stringify(validPayload({
    provider: "openai",
    model: "gpt-4.1-mini"
  }))), env));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.deepEqual(await response.json(), {
    text: "Salaan.",
    provider: "openai",
    model: "gpt-4.1-mini"
  });
  assert.equal(String(call[0]),
    "https://gateway.ai.cloudflare.com/v1/0123456789abcdef0123456789abcdef/somali-ai/openai/chat/completions");
  assert.equal(call[1].headers["cf-aig-authorization"], "Bearer mock-gateway-token");
  assert.deepEqual(JSON.parse(call[1].body).messages, [
    { role: "system", content: "Respond in Somali." },
    { role: "user", content: "Salaan!" }
  ]);
});

test("Worker routes supported providers through documented AI Gateway endpoints", async () => {
  const mappings = [
    ["openai", "gpt-4.1-mini", "/openai/chat/completions"],
    ["anthropic", "claude-sonnet-4-5", "/anthropic/v1/messages"],
    ["mistral", "mistral-large-latest", "/mistral/v1/chat/completions"],
    ["deepseek", "deepseek-chat", "/deepseek/chat/completions"],
    ["cohere", "command-r-plus", "/cohere/v1/chat"],
    ["xai", "grok-4", "/grok/v1/chat/completions"]
  ];
  for (const [provider, model, expectedPath] of mappings) {
    let requestUrl;
    let requestInit;
    const testEnv = {
      ...env,
      ALLOWED_MODELS: JSON.stringify({ [provider]: [model] })
    };
    const response = await withMockFetch(async (url, init) => {
      requestUrl = String(url);
      requestInit = init;
      const output = provider === "anthropic"
        ? { content: [{ type: "text", text: "OK." }] }
        : provider === "cohere"
          ? { text: "OK." }
          : { choices: [{ message: { content: "OK." } }] };
      return Response.json(output);
    }, () => worker.fetch(
      request(JSON.stringify(validPayload({ provider, model }))), testEnv
    ));
    assert.equal(response.status, 200, provider);
    assert.ok(requestUrl.endsWith(expectedPath), provider);
    assert.equal(
      new Headers(requestInit.headers).get("cf-aig-authorization"),
      "Bearer mock-gateway-token",
      provider
    );
    assert.equal(new Headers(requestInit.headers).has("authorization"), false, provider);
    assert.equal((await response.json()).text, "OK.", provider);
  }
});

test("Worker routes Gemini to Google AI Studio native endpoint with secure payload", async () => {
  let call;
  const testEnv = {
    ...env,
    CF_AIG_TOKEN: "mock-gateway-token",
    AI: undefined
  };
  const response = await withMockFetch(async (...args) => {
    call = args;
    return new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: "Jawaab Gemini ah." }] }
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  }, () => worker.fetch(request(JSON.stringify(validPayload())), testEnv));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    text: "Jawaab Gemini ah.",
    provider: "gemini",
    model: "gemini-2.5-flash"
  });
  assert.equal(
    String(call[0]),
    "https://gateway.ai.cloudflare.com/v1/0123456789abcdef0123456789abcdef/somali-ai/google-ai-studio/v1/models/gemini-2.5-flash:generateContent"
  );
  assert.equal(call[1].method, "POST");
  assert.equal(call[1].headers["cf-aig-authorization"], "Bearer mock-gateway-token");
  assert.equal(call[1].headers["x-goog-api-key"], undefined);
  assert.equal(call[1].headers["cf-aig-byok-alias"], undefined);
  assert.deepEqual(JSON.parse(call[1].body), {
    systemInstruction: {
      parts: [{ text: "Respond in Somali." }]
    },
    contents: [{
      role: "user",
      parts: [{ text: "Salaan!" }]
    }]
  });
});

test("Worker routes OpenRouter through chat completions with Cloudflare BYOK authentication", async () => {
  let call;
  const gatewayToken = "mock-gateway-token";
  const model = "openai/gpt-4o-mini";
  const response = await withMockFetch(async (...args) => {
    call = args;
    return new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "Jawaab OpenRouter." } }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  }, () => worker.fetch(
    request(JSON.stringify(validPayload({ provider: "openrouter", model }))),
    { ...env, CF_AIG_TOKEN: gatewayToken }
  ));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    text: "Jawaab OpenRouter.",
    provider: "openrouter",
    model
  });
  assert.equal(
    String(call[0]),
    "https://gateway.ai.cloudflare.com/v1/0123456789abcdef0123456789abcdef/somali-ai/openrouter/v1/chat/completions"
  );
  assert.equal(call[1].method, "POST");
  assert.equal(call[1].headers.authorization, undefined);
  assert.equal(call[1].headers["cf-aig-authorization"], `Bearer ${gatewayToken}`);
  assert.equal(call[1].headers["cf-aig-byok-alias"], "cf-aig-byok-alias");
  assert.deepEqual(JSON.parse(call[1].body), {
    model,
    messages: [
      { role: "system", content: "Respond in Somali." },
      { role: "user", content: "Salaan!" }
    ]
  });
});

test("Worker rejects OpenRouter invalid models and missing Gateway tokens safely", async () => {
  let fetchCalls = 0;
  const fetchMock = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({
      choices: [{ message: { content: "should not run" } }]
    }), { status: 200 });
  };
  const invalidModel = await withMockFetch(fetchMock, () => worker.fetch(
    request(JSON.stringify(validPayload({
      provider: "openrouter",
      model: "unknown/model:free"
    }))),
    env
  ));
  assert.equal(invalidModel.status, 400);
  assert.equal((await invalidModel.json()).error.code, "MODEL_NOT_ALLOWED");

  const missingCredentials = await withMockFetch(fetchMock, () => worker.fetch(
    request(JSON.stringify(validPayload({
      provider: "openrouter",
      model: "openai/gpt-4o-mini"
    }))),
    { ...env, CF_AIG_TOKEN: undefined }
  ));
  assert.equal(missingCredentials.status, 503);
  assert.equal(
    (await missingCredentials.json()).error.code,
    "AI_GATEWAY_TOKEN_MISSING"
  );
  assert.equal(fetchCalls, 0);

  const missingAlias = await withMockFetch(fetchMock, () => worker.fetch(
    request(JSON.stringify(validPayload({
      provider: "openrouter",
      model: "openai/gpt-4o-mini"
    }))),
    { ...env, OPENROUTER_BYOK_ALIAS: undefined }
  ));
  assert.equal(missingAlias.status, 503);
  assert.equal((await missingAlias.json()).error.code, "OPENROUTER_BYOK_ALIAS_MISSING");
  assert.equal(fetchCalls, 0);
});

test("Worker maps OpenRouter auth, model, and rate-limit errors without leaking details", async () => {
  const cases = [
    [401, {
      error: { code: "mock-openrouter-token", message: "bad key" }
    }, "OPENROUTER_AUTH_FAILED"],
    [401, {
      success: false,
      error: [{ code: 2009, message: "gateway auth rejected" }]
    }, "AI_GATEWAY_AUTH_FAILED"],
    [402, { error: "billing restriction" }, "OPENROUTER_BILLING_FAILED"],
    [404, { error: { message: "private model detail" } }, "OPENROUTER_MODEL_NOT_FOUND"],
    [429, { error: "private rate detail" }, "OPENROUTER_RATE_LIMITED"]
  ];
  const logged = [];
  const previousError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    for (const [status, payload, expectedCode] of cases) {
      const response = await withMockFetch(async () => new Response(
        JSON.stringify(payload),
        { status, headers: { "content-type": "application/json" } }
      ), () => worker.fetch(
        request(JSON.stringify(validPayload({
          provider: "openrouter",
          model: "openai/gpt-4o-mini"
        }))),
        env
      ));
      const body = await response.text();
      const error = JSON.parse(body).error;
      assert.equal(error.code, expectedCode);
      if (expectedCode === "AI_GATEWAY_AUTH_FAILED") {
        assert.match(error.message, /CF_AIG_TOKEN.*current token for this account.*AI Gateway Run/);
      }
      assert.doesNotMatch(body, /private/);
    }
    assert.doesNotMatch(JSON.stringify(logged), /mock-gateway-token|private model detail|private rate detail/);
  } finally {
    console.error = previousError;
  }
});

test("Worker sends one Bearer prefix after normalizing the Gateway token", async () => {
  for (const tokenValue of [
    "mock-gateway-token",
    "  Bearer mock-gateway-token  ",
    "  bEaReR   mock-gateway-token "
  ]) {
    let call;
    await withMockFetch(async (...args) => {
      call = args;
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "OK." }] } }]
      }), { status: 200 });
    }, () => worker.fetch(
      request(JSON.stringify(validPayload())),
      { ...env, CF_AIG_TOKEN: tokenValue }
    ));
    assert.equal(
      call[1].headers["cf-aig-authorization"],
      `Bearer ${tokenValue.trim().replace(/^Bearer\s+/i, "")}`
    );
  }
});

test("Worker does not expose temporary Gateway diagnostics or tokens in errors", async () => {
  const token = "diagnostic-token-must-not-leak";
  const response = await withMockFetch(async (_url, options) => {
    assert.equal(options.headers["cf-aig-authorization"], `Bearer ${token}`);
    return new Response(
    JSON.stringify({
      success: false,
      error: [{ code: 2009, message: "Unauthorized" }]
    }),
    { status: 401 }
    );
  }, () => worker.fetch(
    request(JSON.stringify(validPayload())),
    { ...env, CF_AIG_TOKEN: token }
  ));
  const body = await response.text();
  const parsed = JSON.parse(body);
  assert.equal(parsed.error.code, "AI_GATEWAY_AUTH_FAILED");
  assert.equal(Object.hasOwn(parsed, "diagnostics"), false);
  assert.doesNotMatch(body, new RegExp(token));
});

test("Google AI Studio uses the default BYOK alias without exposing key material", async () => {
  let call;
  await withMockFetch(async (...args) => {
    call = args;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "OK." }] } }]
    }), { status: 200 });
  }, () => worker.fetch(
    request(JSON.stringify(validPayload())),
    { ...env, CF_AIG_BYOK_ALIAS: "somali-production" }
  ));
  assert.equal(call[1].headers["cf-aig-byok-alias"], undefined);
  assert.equal(call[1].headers["x-goog-api-key"], undefined);
});

test("Worker distinguishes gateway authentication from Google credential errors", async () => {
  const cases = [
    [401, {}, "UPSTREAM_AUTH_SOURCE_UNKNOWN"],
    [401, {
      error: {
        status: "UNAUTHENTICATED",
        message: "Gateway authorization rejected."
      }
    }, "UPSTREAM_AUTH_SOURCE_UNKNOWN"],
    [401, {
      error: {
        message: "Invalid cf-aig-authorization token."
      }
    }, "AI_GATEWAY_AUTH_FAILED"],
    [401, {
      success: false,
      error: [{ code: 2009, message: "Authentication rejected." }],
      message: "Unauthorized"
    }, "AI_GATEWAY_AUTH_FAILED"],
    [401, {
      error: {
        message: "API key not valid. Please pass a valid API key.",
        status: "UNAUTHENTICATED"
      }
    }, "GOOGLE_AI_STUDIO_CREDENTIALS_REJECTED"],
    [403, {}, "AI_GATEWAY_ACCESS_DENIED"],
    [400, {
      error: {
        message: "API key not valid. Please pass a valid API key.",
        status: "INVALID_ARGUMENT"
      }
    }, "GOOGLE_AI_STUDIO_CREDENTIALS_REJECTED"],
    [403, {
      error: {
        message: "A private provider detail",
        details: [{ reason: "API_KEY_SERVICE_BLOCKED" }]
      }
    }, "GOOGLE_AI_STUDIO_CREDENTIALS_REJECTED"],
    [402, {}, "AI_GATEWAY_BILLING_FAILED"],
    [404, {}, "MODEL_NOT_FOUND"],
    [400, {}, "GOOGLE_AI_STUDIO_REQUEST_REJECTED"]
  ];
  const logged = [];
  const previousError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    for (const [status, payload, expectedCode] of cases) {
      const response = await withMockFetch(async () => new Response(
        JSON.stringify(payload),
        { status, headers: { "content-type": "application/json" } }
      ), () => worker.fetch(request(JSON.stringify(validPayload())), env));
      const body = await response.text();
      assert.equal((await new Response(body).json()).error.code, expectedCode);
      assert.doesNotMatch(body, /API key not valid|private provider detail/);
    }
    assert.match(JSON.stringify(logged), /AI_GATEWAY_AUTH_FAILED/);
    assert.match(JSON.stringify(logged), /UPSTREAM_AUTH_SOURCE_UNKNOWN/);
    assert.match(JSON.stringify(logged), /GOOGLE_AI_STUDIO_CREDENTIALS_REJECTED/);
    assert.doesNotMatch(JSON.stringify(logged), /API key not valid|private provider detail/);
  } finally {
    console.error = previousError;
  }
});

test("Worker logs a sanitized Cloudflare Ray ID for upstream errors", async () => {
  const logged = [];
  const previousError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    await withMockFetch(async () => new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: {
          "cf-ray": "a1b2c3d4e5f6-IAD",
          "content-type": "application/json; charset=utf-8",
          server: "cloudflare",
          "www-authenticate": "Bearer private-challenge"
        }
      }
    ), () => worker.fetch(request(JSON.stringify(validPayload())), env));
    const diagnostics = JSON.stringify(logged);
    assert.match(diagnostics, /a1b2c3d4e5f6-IAD/);
    assert.match(diagnostics, /application\/json; charset=utf-8/);
    assert.match(diagnostics, /hasWwwAuthenticate/);
    assert.doesNotMatch(diagnostics, /private-challenge/);
  } finally {
    console.error = previousError;
  }
});

test("Worker logs allowlisted upstream error metadata without provider messages", async () => {
  const logged = [];
  const previousError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    await withMockFetch(async () => new Response(JSON.stringify({
      error: {
        code: 401,
        status: "UNAUTHENTICATED",
        message: "private provider detail and credential material",
        details: [{ reason: "ACCESS_TOKEN_EXPIRED" }]
      }
    }), {
      status: 401,
      headers: { "content-type": "application/json" }
    }), () => worker.fetch(request(JSON.stringify(validPayload())), env));
    const diagnostics = JSON.stringify(logged);
    assert.match(diagnostics, /"upstreamErrorShape":\["error:object","error\[0\]:object","error\[0\]\.code:number","error\[0\]\.status:string","error\[0\]\.message:string","error\[0\]\.details:array"\]/);
    assert.match(diagnostics, /"upstreamErrorCodes":\["401"\]/);
    assert.match(diagnostics, /"upstreamErrorStatuses":\["UNAUTHENTICATED"\]/);
    assert.match(diagnostics, /"upstreamErrorReasons":\["ACCESS_TOKEN_EXPIRED"\]/);
    assert.doesNotMatch(diagnostics, /private provider detail|credential material/);
  } finally {
    console.error = previousError;
  }
});

test("Worker never returns or logs the Gateway token on authentication failure", async () => {
  const logged = [];
  const previousError = console.error;
  console.error = (...args) => logged.push(args);
  const token = "test-token-must-not-leak";
  try {
    const response = await withMockFetch(async (_url, options) => {
      assert.equal(options.headers["cf-aig-authorization"], `Bearer ${token}`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401
      });
    }, () => worker.fetch(
      request(JSON.stringify(validPayload())),
      { ...env, CF_AIG_TOKEN: token }
    ));
    const body = await response.text();
    assert.match(body, /UPSTREAM_AUTH_SOURCE_UNKNOWN/);
    assert.doesNotMatch(body, new RegExp(token));
    assert.doesNotMatch(JSON.stringify(logged), new RegExp(token));
  } finally {
    console.error = previousError;
  }
});

test("Worker rejects disallowed origins, methods, content types, and models", async () => {
  const disallowed = await worker.fetch(
    new Request("http://localhost:8787/", {
      method: "POST",
      headers: { origin: "http://attacker.example", "content-type": "application/json" },
      body: JSON.stringify(validPayload())
    }),
    env
  );
  assert.equal(disallowed.status, 403);

  const noOrigin = await worker.fetch(
    new Request("http://localhost:8787/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validPayload())
    }),
    env
  );
  assert.equal(noOrigin.status, 403);

  const method = await worker.fetch(request(undefined, { method: "GET" }), env);
  assert.equal(method.status, 405);

  const wrongContentType = await worker.fetch(
    request(JSON.stringify(validPayload()), {
      headers: { "content-type": "text/plain" }
    }),
    env
  );
  assert.equal(wrongContentType.status, 415);

  const notAllowedModel = await worker.fetch(
    request(JSON.stringify(validPayload({ model: "not-allowed" }))),
    env
  );
  assert.equal(notAllowedModel.status, 400);

  const invalidProvider = await worker.fetch(
    request(JSON.stringify(validPayload({ provider: "unknown" }))),
    env
  );
  assert.equal(invalidProvider.status, 400);

  const missingPrompt = { ...validPayload() };
  delete missingPrompt.prompt;
  assert.equal(
    (await worker.fetch(request(JSON.stringify(missingPrompt)), env)).status,
    400
  );

  const missingInstructions = { ...validPayload() };
  delete missingInstructions.instructions;
  assert.equal(
    (await worker.fetch(request(JSON.stringify(missingInstructions)), env)).status,
    400
  );
});

test("Worker bounds request body size and reports malformed JSON", async () => {
  const oversized = new Request("http://localhost:8787/", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "content-length": String(MAX_BODY_BYTES + 1)
    },
    body: "{}"
  });
  const oversizedResponse = await worker.fetch(oversized, env);
  assert.equal(oversizedResponse.status, 413);

  const malformed = await worker.fetch(request("{"), env);
  assert.equal(malformed.status, 400);
});

test("Worker handles AI Gateway provider errors without returning exception details", async () => {
  const logged = [];
  const previousError = console.error;
  console.error = (...args) => logged.push(args);
  const providerPayload = JSON.stringify(validPayload({
    provider: "openai",
    model: "gpt-4.1-mini"
  }));
  try {
    const response = await withMockFetch(async () => Response.json({
      error: { message: "provider key must not leak" }
    }, { status: 502 }), () => worker.fetch(request(providerPayload), env));
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.error.code, "AI_GATEWAY_PROVIDER_FAILED");
    assert.equal(Object.hasOwn(body, "diagnostics"), false);
    assert.doesNotMatch(JSON.stringify(body), /provider key must not leak/);
    assert.doesNotMatch(JSON.stringify(logged), /provider key must not leak/);
    assert.match(JSON.stringify(logged), /AI Gateway provider request failed/);
  } finally {
    console.error = previousError;
  }
});

test("Worker maps missing BYOK credentials and rejected model errors safely", async () => {
  const logged = [];
  const previousError = console.error;
  console.error = (...args) => logged.push(args);
  const providerPayload = JSON.stringify(validPayload({
    provider: "openai",
    model: "gpt-4.1-mini"
  }));
  try {
    const credentialsResponse = await withMockFetch(async () => Response.json({
      success: false,
      errors: [{ code: 2044, message: "sensitive provider response" }]
    }, { status: 400 }), () => worker.fetch(request(providerPayload), env));
    assert.equal(credentialsResponse.status, 502);
    assert.deepEqual((await credentialsResponse.json()).error, {
      code: "PROVIDER_CREDENTIALS_REQUIRED",
      message: "Cloudflare AI Gateway requires a valid provider key with the default alias."
    });

    const rejectedResponse = await withMockFetch(async () => Response.json({
      error: { message: "sensitive model detail" }
    }, { status: 400 }), () => worker.fetch(request(providerPayload), env));
    assert.equal(rejectedResponse.status, 422);
    assert.equal(
      (await rejectedResponse.json()).error.code,
      "AI_GATEWAY_REQUEST_REJECTED"
    );

    const authenticationResponse = await withMockFetch(async () => Response.json({
      error: { message: "sensitive authentication detail" }
    }, { status: 403 }), () => worker.fetch(request(providerPayload), env));
    assert.equal(authenticationResponse.status, 502);
    assert.equal(
      (await authenticationResponse.json()).error.code,
      "AI_GATEWAY_AUTH_FAILED"
    );
    assert.doesNotMatch(
      JSON.stringify(logged),
      /sensitive provider response|sensitive model detail|sensitive authentication detail/
    );
  } finally {
    console.error = previousError;
  }
});

test("Worker responds to CORS preflight without invoking inference", async () => {
  let calls = 0;
  const testEnv = {
    ...env,
    AI: { run: async () => { calls += 1; return { response: "unused" }; } }
  };
  const response = await worker.fetch(
    request(undefined, { method: "OPTIONS" }),
    testEnv
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-methods"), "POST, OPTIONS");
  assert.equal(calls, 0);
});

test("bounded JSON reader also rejects oversized streaming bodies", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_BODY_BYTES));
      controller.enqueue(new Uint8Array([1]));
      controller.close();
    }
  });
  const result = await readBoundedJson(new Request("http://localhost:8787/", {
    method: "POST",
    body,
    duplex: "half"
  }));
  assert.equal(result.status, 413);
});

test("Worker refuses anonymous inference outside local development", async () => {
  let calls = 0;
  const remoteEnv = {
    ...env,
    AI: { run: async () => { calls += 1; return { response: "must not run" }; } }
  };
  const response = await worker.fetch(
    new Request("https://abuur-ai-gateway.workers.dev/", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(validPayload())
    }),
    remoteEnv
  );
  assert.equal(response.status, 503);
  assert.equal(calls, 0);

  const disabledLocalEnv = {
    ...env,
    ALLOW_UNAUTHENTICATED_INFERENCE: "false",
    AI: { run: async () => { calls += 1; return { response: "must not run" }; } }
  };
  const localResponse = await worker.fetch(
    request(JSON.stringify(validPayload())),
    disabledLocalEnv
  );
  assert.equal(localResponse.status, 503);
  assert.equal(calls, 0);
});
