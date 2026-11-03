import test from "node:test";
import assert from "node:assert/strict";
import { abuurAI } from "../src/browser.js";

test("browser entry registers Gemini and sends a browser-compatible request", async () => {
  let requestUrl;
  let requestInit;
  const ai = abuurAI({
    provider: "gemini",
    model: "gemini-2.5-flash",
    apiKey: "fake-browser-test-key",
    fetch: async (url, init) => {
      requestUrl = url;
      requestInit = init;
      return Response.json({
        candidates: [{ content: { parts: [{ text: "Salaan dunida." }] } }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 }
      });
    }
  });

  const result = await ai.weydii("Salaan.");

  assert.equal(requestUrl,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
  assert.equal(new Headers(requestInit.headers).get("x-goog-api-key"), "fake-browser-test-key");
  assert.deepEqual(JSON.parse(requestInit.body).contents, [
    { role: "user", parts: [{ text: "Salaan." }] }
  ]);
  assert.equal(result.text, "Salaan dunida.");
  assert.deepEqual(result.usage, { inputTokens: 5, outputTokens: 3 });
  assert.deepEqual(ai.getProviders(), ["gemini"]);
});

test("browser Gemini errors do not disclose the API key", async () => {
  const key = "fake-browser-secret";
  const ai = abuurAI({
    provider: "gemini",
    apiKey: key,
    fetch: async () => Response.json({
      error: { message: `Rejected credential ${key}` }
    }, { status: 401 })
  });

  await assert.rejects(ai.weydii("Test"), (error) => {
    assert.match(error.message, /Rejected credential \[redacted\]/);
    assert.equal(error.message.includes(key), false);
    return true;
  });
});

test("browser Gemini requires an explicit key and never falls back to Node environment", async () => {
  const ai = abuurAI({ provider: "gemini" });
  await assert.rejects(
    ai.weydii("Test"),
    /Gemini API key is required.*Browser keys are public/
  );
});
