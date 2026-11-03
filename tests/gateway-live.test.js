import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSomaliAI } from "../src/index.js";

const workerEndpoint = process.env.GATEWAY_WORKER_URL || "http://127.0.0.1:8787";
const selectedProvider = process.env.GATEWAY_LIVE_PROVIDER || "gemini";
const runningUnderTestSuite = Boolean(process.env.NODE_TEST_CONTEXT);
const wranglerConfig = readFileSync(
  new URL("../templates/cloudflare-ai-gateway/wrangler.toml", import.meta.url),
  "utf8"
);
const developmentVars = wranglerConfig.match(
  /\[env\.development\.vars\]([\s\S]*?)(?=\r?\n\[|$)/
)?.[1];

function getDevelopmentVariable(name) {
  const value = developmentVars?.match(
    new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, "m")
  )?.[1];
  if (!value) {
    throw new Error(`Missing ${name} in Wrangler development variables.`);
  }
  return value;
}

const accountId = getDevelopmentVariable("ACCOUNT_ID");
const gatewayId = getDevelopmentVariable("GATEWAY_ID");

if (!["gemini", "openrouter"].includes(selectedProvider)) {
  throw new Error('GATEWAY_LIVE_PROVIDER must be "gemini" or "openrouter".');
}

test("live Gemini inference through the local Cloudflare Worker", {
  skip: runningUnderTestSuite || selectedProvider !== "gemini"
}, async () => {
  const response = await fetch(workerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:5173"
    },
    body: JSON.stringify({
      accountId,
      gatewayId,
      provider: "gemini",
      model: "gemini-2.5-flash",
      prompt: "Is salaam af Soomaali. Jawaab gaaban bixi.",
      instructions: "Respond naturally in Somali."
    })
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const safeResponse = typeof data?.text === "string"
    ? { text: data.text, provider: data.provider, model: data.model }
    : data?.error && typeof data.error === "object"
      ? {
        error: {
          code: data.error.code,
          message: data.error.message
        }
      }
      : { error: { code: "INVALID_RESPONSE", message: "Worker returned an invalid response." } };

  console.log("HTTP status:", response.status);
  console.log("Safe response:", JSON.stringify(safeResponse));
  assert.equal(response.ok, true, `Gemini inference failed with HTTP ${response.status}: ${JSON.stringify(safeResponse)}`);
  assert.equal(typeof data?.text, "string", "Worker response did not contain generated text.");
  assert.ok(data.text.trim(), "Gemini returned empty text.");
});

test("live OpenRouter inference through the SDK and local Cloudflare Worker", {
  skip: runningUnderTestSuite || selectedProvider !== "openrouter"
}, async () => {
  const model = "openai/gpt-4o-mini";
  let upstreamStatus;
  let safeResponse;
  const ai = createSomaliAI({
    provider: "gemini",
    model: "gemini-2.5-flash",
    providers: { openrouter: { model } },
    gateway: {
      type: "cloudflare",
      accountId,
      gatewayId,
      endpoint: workerEndpoint
    },
    fetch: async (url, options) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          origin: "http://localhost:5173"
        }
      });
      upstreamStatus = response.status;
      let payload;
      try {
        payload = await response.clone().json();
      } catch {
        payload = null;
      }
      safeResponse = typeof payload?.text === "string"
        ? { text: payload.text, provider: payload.provider, model: payload.model }
        : payload?.error && typeof payload.error === "object"
          ? {
            error: {
              code: payload.error.code,
              message: payload.error.message
            }
          }
          : {
            error: {
              code: "INVALID_RESPONSE",
              message: "Worker returned an invalid response."
            }
          };
      return response;
    }
  });

  let result;
  let requestError;
  try {
    result = await ai.weydii(
      "Reply with the exact phrase: OpenRouter live test OK.",
      { provider: "openrouter" }
    );
  } catch (error) {
    requestError = error;
  }

  if (upstreamStatus !== undefined) {
    console.log("HTTP status:", upstreamStatus);
    console.log("Safe response:", JSON.stringify(safeResponse));
  } else {
    console.log("HTTP status: unavailable (request did not receive a Worker response)");
    console.log("Safe response:", JSON.stringify({
      error: {
        code: requestError?.name === "TypeError" ? "WORKER_UNREACHABLE" : "SDK_REQUEST_FAILED",
        message: "The SDK request did not complete successfully."
      }
    }));
  }

  assert.equal(upstreamStatus, 200, "OpenRouter request did not receive HTTP 200 from the Worker.");
  assert.equal(result?.provider, "openrouter");
  assert.equal(result?.model, model);
  assert.equal(typeof result?.text, "string", "OpenRouter response did not contain generated text.");
  assert.ok(result.text.trim(), "OpenRouter returned empty text.");
});