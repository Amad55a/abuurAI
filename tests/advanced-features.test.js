import test from "node:test";
import assert from "node:assert/strict";
import { createSomaliAI } from "../src/index.js";
import {
  chunkDocuments,
  retrieveRelevantChunks
} from "../src/somali/knowledge.js";

test("default mode uses Gemini and accepts the Somali question object", async () => {
  let request;
  const ai = createSomaliAI({
    apiKey: "fake-default-key",
    model: "configured-gemini-model",
    providers: {
      gemini: {
        client: {
          models: {
            generateContent: async (receivedRequest) => {
              request = receivedRequest;
              return { text: "Jawaab." };
            }
          }
        }
      }
    }
  });

  const result = await ai.weydii({ "su'aal": "Waa maxay AI?" });
  assert.equal(result.text, "Jawaab.");
  assert.equal(request.contents, "Waa maxay AI?");
  assert.equal(request.model, "configured-gemini-model");
});

test("automatic provider mode selects configured providers predictably", async () => {
  const ai = createSomaliAI({
    mode: "auto",
    providers: {
      gemini: { apiKey: "fake-gemini-key", model: "gemini-model" },
      anthropic: { apiKey: "fake-anthropic-key", model: "claude-model" }
    }
  });

  assert.equal(ai.getConfig().mode, "auto");
  assert.deepEqual(ai.getConfig().configuredProviders, ["gemini", "anthropic"]);
  assert.equal(ai.doorModel({ task: "translation" }).provider, "gemini");
  assert.deepEqual(
    ai.doorModel({
      task: "coding",
      preferredProvider: "anthropic",
      allowedProviders: ["anthropic"]
    }),
    {
      provider: "anthropic",
      model: "claude-model",
      task: "coding",
      reason: "Selected the configured preferred provider for coding.",
      candidates: ["anthropic"]
    }
  );
  assert.throws(
    () => ai.doorModel({ task: "translation", preferredProvider: "cohere" }),
    /unavailable or not allowed/
  );
  assert.throws(
    () => ai.doorModel({ task: "unknown-task" }),
    /Unsupported task/
  );
  assert.throws(
    () => ai.doorModel({ task: "writing", allowedProviders: ["unknown"] }),
    /supported provider identifiers/
  );
});

test("provider preferences prioritize task settings and remain private-copy config", () => {
  const ai = createSomaliAI({
    mode: "auto",
    providerPreference: ["gemini"],
    taskProviderPreferences: {
      coding: ["anthropic"]
    },
    providers: {
      gemini: { apiKey: "fake-gemini-key", model: "gemini-model" },
      anthropic: { apiKey: "fake-anthropic-key", model: "claude-model" }
    }
  });

  assert.equal(ai.doorModel({ task: "reasoning" }).provider, "gemini");
  assert.equal(ai.doorModel({ task: "coding" }).provider, "anthropic");
  assert.equal(
    ai.doorModel({ task: "coding", preferredProvider: "gemini" }).provider,
    "gemini"
  );

  const publicConfig = ai.getConfig();
  publicConfig.providerPreference.push("xai");
  publicConfig.taskProviderPreferences.coding.push("xai");
  assert.equal(ai.doorModel({ task: "coding" }).provider, "anthropic");

  assert.throws(
    () => createSomaliAI({ providerPreference: ["unknown"] }),
    /supported provider identifiers/
  );
  assert.throws(
    () => createSomaliAI({ taskProviderPreferences: { unknown: ["gemini"] } }),
    /Unsupported provider preference task/
  );
});

test("automatic mode does not silently switch providers after a failure", async () => {
  let fallbackRequests = 0;
  const ai = createSomaliAI({
    mode: "auto",
    providers: {
      gemini: {
        apiKey: "fake-gemini-key",
        model: "gemini-model",
        client: {
          models: {
            generateContent: async () => {
              const error = new Error("temporary provider failure");
              error.code = "EAI_AGAIN";
              throw error;
            }
          }
        }
      },
      anthropic: {
        apiKey: "fake-anthropic-key",
        model: "claude-model",
        fetch: async () => {
          fallbackRequests += 1;
          return new Response(JSON.stringify({
            content: [{ type: "text", text: "Unexpected fallback" }]
          }));
        }
      }
    }
  });

  await assert.rejects(() => ai.weydii("Question"), /Gemini: temporary provider failure/);
  assert.equal(fallbackRequests, 0);
});

test("automatic mode rejects explicit providers that are not configured", async () => {
  const ai = createSomaliAI({
    mode: "auto",
    providers: {
      gemini: { apiKey: "fake-gemini-key", model: "gemini-model" }
    }
  });

  await assert.rejects(
    () => ai.weydii("Question", { provider: "anthropic" }),
    /not configured for automatic mode/
  );
});

test("doorModel requires a configured provider and validates mode config", () => {
  assert.throws(
    () => createSomaliAI({ mode: "invalid" }),
    /mode must be either/
  );
  assert.throws(
    () => createSomaliAI({ mode: "auto", providers: { unknown: {} } }),
    /not supported/
  );
  assert.throws(
    () => createSomaliAI({ mode: "auto", providers: { gemini: null } }),
    /must be an object/
  );
  assert.throws(
    () => createSomaliAI({ mode: "auto" }).doorModel(),
    /No configured AI provider/
  );
});

test("language detection handles Somali, English, mixed, other, and insufficient text", () => {
  const ai = createSomaliAI();

  const somali = ai.ogaawLuqad({ text: "Waa maxay maanta?" });
  assert.equal(somali.language, "so");
  assert.deepEqual(somali.languages, ["so"]);
  assert.equal(somali.method, "heuristic");
  assert.equal(somali.confidenceType, "uncalibrated-heuristic");

  assert.equal(ai.ogaawLuqad("What is artificial intelligence?").language, "en");
  assert.deepEqual(
    ai.ogaawLuqad("Asc, how are you maanta?").languages,
    ["so", "en"]
  );
  assert.equal(ai.ogaawLuqad("Bonjour, merci beaucoup").language, "fr");
  assert.equal(ai.ogaawLuqad("x").language, "unknown");
  assert.throws(() => ai.ogaawLuqad(""), /valid text/);
});

test("document chunking respects configured size and retains exact source text", () => {
  const content = `${"waxbarasho ".repeat(35)}waxbarashadu waa muhiim`;
  const chunks = chunkDocuments(
    [{ id: "education-doc", content }],
    { chunkSize: 120, overlap: 20 }
  );

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.text.length <= 120));
  assert.ok(chunks.every((chunk) => chunk.documentId === "education-doc"));
  assert.ok(chunks.some((chunk) => chunk.text.includes("waxbarashadu waa muhiim")));
});

test("document retrieval ranks relevant Somali and English passages", () => {
  const documents = [
    { id: "education", content: "Education supports national development." },
    { id: "health", content: "Hospitals provide important health services." }
  ];
  const chunks = chunkDocuments(documents);
  const results = retrieveRelevantChunks("What about education?", chunks);

  assert.equal(results[0].documentId, "education");
  assert.ok(results[0].score > 0);
  assert.equal(retrieveRelevantChunks("How many hospitals?", chunks)[0].documentId, "health");
  assert.deepEqual(retrieveRelevantChunks("xyz", chunks), []);
});

test("raadsoAqoon returns grounded source references and avoids calls without matches", async () => {
  let requestCount = 0;
  let receivedRequest;
  const ai = createSomaliAI({ provider: "fake" });
  ai.providers.register("fake", {
    model: "fake-model",
    generate: async (request) => {
      requestCount += 1;
      receivedRequest = request;
      return {
        text: "Education supports national development [education-doc].",
        provider: "fake",
        model: "fake-model"
      };
    }
  });

  const answer = await ai.raadsoAqoon({
    question: "What does this document say about education?",
    documents: [
      { id: "education-doc", content: "Education supports national development." },
      { id: "health-doc", content: "Hospitals provide important health services." }
    ]
  });

  assert.equal(answer.hasEnoughInformation, true);
  assert.match(answer.answer, /\[education-doc\]/);
  assert.deepEqual(answer.sources.map((source) => source.id), ["education-doc"]);
  assert.match(receivedRequest.prompt, /Do not invent facts or source IDs/);
  assert.equal(requestCount, 1);

  const noAnswer = await ai.raadsoAqoon({
    question: "What is the capital of France?",
    documents: [{ id: "doc", content: "The document discusses coastal weather." }]
  });
  assert.equal(noAnswer.hasEnoughInformation, false);
  assert.deepEqual(noAnswer.sources, []);
  assert.equal(requestCount, 1);
  assert.throws(
    () => chunkDocuments([{ id: "bad", content: " " }]),
    /non-empty id and content/
  );
});

test("usage tracking records requests, actual tokens, custom cost, failure, and reset", async () => {
  const ai = createSomaliAI({
    provider: "fake",
    pricing: {
      fake: {
        "fake-model": {
          inputPerMillion: 2,
          outputPerMillion: 4
        }
      }
    }
  });
  ai.providers.register("fake", {
    model: "fake-model",
    generate: async ({ prompt }) => {
      if (prompt === "fail") {
        throw new Error("request failed");
      }
      return {
        text: "Response",
        usage: { inputTokens: 100, outputTokens: 50 }
      };
    }
  });

  await ai.weydii("Question");
  const successfulUsage = ai.cabirIsticmaalka();
  assert.equal(successfulUsage.estimatedCost, 0.0004);
  await assert.rejects(() => ai.weydii("fail"), /request failed/);

  const usage = ai.cabirIsticmaalka();
  assert.equal(usage.totalRequests, 2);
  assert.equal(usage.successfulRequests, 1);
  assert.equal(usage.failedRequests, 1);
  assert.equal(usage.inputTokens, 100);
  assert.equal(usage.outputTokens, 50);
  assert.equal(usage.requestsWithTokenUsage, 1);
  assert.equal(usage.providers.fake.models["fake-model"].estimatedCost, null);
  assert.equal(usage.providers.fake.models["fake-model"].failedRequests, 1);
  assert.equal(ai.cabirIsticmaalka({ reset: true }).totalRequests, 2);
  assert.equal(ai.cabirIsticmaalka().totalRequests, 0);
});

test("usage metrics mark unavailable token counts and costs as unknown", async () => {
  const ai = createSomaliAI({ provider: "fake" });
  ai.providers.register("fake", {
    model: "fake-model",
    generate: async () => ({ text: "Response" })
  });

  await ai.weydii("Question");
  const usage = ai.cabirIsticmaalka();
  assert.equal(usage.inputTokens, null);
  assert.equal(usage.outputTokens, null);
  assert.equal(usage.estimatedCost, null);
});

test("qulqul normalizes custom provider chunks and rejects unsupported providers", async () => {
  const ai = createSomaliAI({ provider: "fake" });
  ai.providers.register("fake", {
    async *stream({ prompt, language, signal }) {
      assert.equal(prompt, "Explain AI");
      assert.equal(language, "automatic");
      assert.equal(signal.aborted, false);
      yield { text: "Waa " };
      yield { text: "caqli." };
    }
  });

  const chunks = [];
  for await (const chunk of ai.qulqul({
    prompt: "Explain AI",
    signal: new AbortController().signal
  })) {
    chunks.push(chunk.text);
  }
  assert.deepEqual(chunks, ["Waa ", "caqli."]);

  const unsupported = createSomaliAI({ provider: "no-stream" });
  unsupported.providers.register("no-stream", {
    generate: async () => ({ text: "No streaming" })
  });
  await assert.rejects(
    async () => {
      for await (const _chunk of unsupported.qulqul({ prompt: "Hello" })) {}
    },
    /Streaming is not supported by provider "no-stream"/
  );
});

test("qulqul validates prompt and AbortSignal input", async () => {
  const ai = createSomaliAI({ provider: "fake" });
  ai.providers.register("fake", { async *stream() {} });

  await assert.rejects(
    async () => {
      for await (const _chunk of ai.qulqul({ prompt: "" })) {}
    },
    /non-empty prompt/
  );
  await assert.rejects(
    async () => {
      for await (const _chunk of ai.qulqul({ prompt: "Hello", signal: {} })) {}
    },
    /AbortSignal/
  );
});

test("stream usage is recorded only after a stream completes", async () => {
  const ai = createSomaliAI({ provider: "fake" });
  ai.providers.register("fake", {
    model: "fake-model",
    async *stream() {
      yield { text: "Hello" };
      yield {
        text: "",
        usage: { inputTokens: 10, outputTokens: 5 }
      };
    }
  });

  for await (const _chunk of ai.qulqul({ prompt: "Hello" })) {}
  const usage = ai.cabirIsticmaalka();
  assert.equal(usage.totalRequests, 1);
  assert.equal(usage.successfulRequests, 1);
  assert.equal(usage.inputTokens, 10);
  assert.equal(usage.outputTokens, 5);
});
