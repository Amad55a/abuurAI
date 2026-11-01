import test from "node:test";
import assert from "node:assert/strict";
import { createSomaliAI } from "../src/index.js";

test("capability discovery reports adapter support without credentials", () => {
  const ai = createSomaliAI({ provider: "custom" });
  ai.providers.register("custom", {
    model: "custom-text-v1",
    generate: async () => ({ text: "ok" }),
    stream: async function* () {}
  });

  const report = ai.awoodahaModelka();
  assert.deepEqual(report.providers[0].capabilities, [
    "text-generation",
    "conversation",
    "streaming"
  ]);
  assert.equal(report.providers[0].model, "custom-text-v1");
  assert.equal(report.providers[0].configured, true);
  assert.equal(JSON.stringify(report).includes("apiKey"), false);
  assert.equal(
    ai.awoodahaModelka({ provider: "custom", model: "unconfigured-model" })
      .providers[0].capabilities.length,
    0
  );
});

test("capability configuration restricts adapter features and validates identifiers", () => {
  assert.throws(
    () => createSomaliAI({
      providers: { gemini: { model: "model", capabilities: ["imaginary"] } }
    }),
    /supported capability identifiers/
  );

  const ai = createSomaliAI({ provider: "custom" });
  ai.providers.register("custom", {
    capabilities: ["text-generation", "conversation", "image-understanding"],
    generate: async () => ({ text: "ok" }),
    analyzeImage: async ({ prompt }) => ({ text: prompt })
  });
  assert.deepEqual(ai.awoodahaModelka().providers[0].capabilities, [
    "text-generation",
    "conversation",
    "image-understanding"
  ]);
  assert.throws(
    () => ai.awoodahaModelka({ provider: "missing" }),
    /not supported/
  );
});

test("capability-aware model selection filters models by adapter operation", () => {
  const ai = createSomaliAI({
    mode: "auto",
    providers: {
      gemini: {
        apiKey: "fake-gemini-key",
        model: "text-model",
        client: { models: { generateContent: async () => ({ text: "ok" }) } }
      }
    }
  });

  assert.equal(
    ai.doorModel({ task: "conversation", capability: "text-generation" }).model,
    "text-model"
  );
  assert.throws(
    () => ai.doorModel({ task: "writing", capability: "image-generation" }),
    /No configured AI provider/
  );
  assert.throws(
    () => ai.doorModel({ capability: "unknown" }),
    /supported capability identifier/
  );
});

test("local text normalization preserves Somali words and normalizes whitespace", () => {
  const ai = createSomaliAI();
  assert.equal(ai.caadiyeQoraal("  Salaan,\u00a0sidee   tahay?  "), "Salaan, sidee tahay?");
  assert.throws(() => ai.caadiyeQoraal(" "), /non-empty text/);
});

test("voice, image, document, generation and embedding methods use adapter hooks", async () => {
  const ai = createSomaliAI({ provider: "custom" });
  ai.providers.register("custom", {
    capabilities: [
      "speech-recognition",
      "text-to-speech",
      "image-understanding",
      "document-understanding",
      "image-generation",
      "video-generation",
      "video-job-status",
      "video-retrieval",
      "video-cancellation",
      "embeddings"
    ],
    transcribeAudio: async ({ language }) => ({ text: "Salaan", language }),
    synthesizeSpeech: async ({ text }) => ({ audio: Buffer.from(text) }),
    analyzeImage: async ({ prompt }) => ({ text: prompt }),
    analyzeDocument: async ({ document }) => ({ text: document }),
    generateImage: async () => ({ images: [{ data: "fake-image-data" }] }),
    generateVideo: async () => ({
      id: "job-1",
      status: "processing",
      provider: "custom",
      model: "custom-video"
    }),
    getVideoJob: async ({ id }) => ({
      id,
      status: "processing",
      provider: "custom",
      model: "custom-video"
    }),
    getVideoResult: async ({ id }) => ({
      id,
      status: "completed",
      video: Buffer.from([1, 2, 3])
    }),
    cancelVideoJob: async ({ id }) => ({ id, status: "cancelled" }),
    createEmbedding: async ({ texts }) => ({
      embeddings: texts.map((_, index) => [index + 1, index + 2]),
      model: "embed-v1"
    })
  });

  assert.deepEqual(await ai.hadalUqor({
    audio: Buffer.from([1]),
    mimeType: "audio/wav",
    language: "so"
  }), {
    text: "Salaan",
    language: "so",
    provider: "custom",
    model: null
  });
  assert.deepEqual(await ai.qoraalUhadal({ text: "Salaan" }), {
    audio: Buffer.from("Salaan"),
    provider: "custom",
    model: null
  });
  assert.deepEqual(await ai.falanqeeSawir({ image: "data:image/png;base64,AA==", prompt: "Describe" }), {
    text: "Describe",
    provider: "custom",
    model: null
  });
  assert.deepEqual(await ai.falanqeeDukumenti({ document: "document text", prompt: "Summarize" }), {
    text: "document text",
    provider: "custom",
    model: null
  });
  assert.deepEqual(await ai.sameeSawir({ prompt: "A Somali landscape" }), {
    images: [{ data: "fake-image-data" }],
    provider: "custom",
    model: null
  });
  const job = await ai.sameeMuuqaal({ prompt: "A Somali landscape" });
  assert.deepEqual(job, {
    id: "job-1",
    status: "processing",
    provider: "custom",
    model: "custom-video"
  });
  assert.equal((await ai.hubiMuuqaal({ id: job.id })).status, "processing");
  assert.equal((await ai.helMuuqaal({ id: job.id })).status, "completed");
  assert.equal((await ai.joojiMuuqaal({ id: job.id })).status, "cancelled");
  assert.deepEqual(
    (await ai.sameeEmbedding({ texts: ["one", "two"] })).embeddings,
    [[1, 2], [2, 3]]
  );
  assert.equal(ai.isuEegEmbedding([1, 0], [1, 0]), 1);
  assert.throws(
    () => ai.isuEegEmbedding([1], [1, 2]),
    /matching dimensions/
  );
});

test("unsupported built-in media operations fail explicitly and validate requests", async () => {
  const ai = createSomaliAI({
    provider: "gemini",
    apiKey: "fake-key",
    model: "fake-model",
    providers: {
      gemini: {
        client: { models: { generateContent: async () => ({ text: "not called" }) } }
      }
    }
  });
  await assert.rejects(
    () => ai.hadalUqor({ audio: Buffer.from([1]), mimeType: "audio/wav" }),
    /does not implement the "speech-recognition" capability/
  );
  await assert.rejects(
    () => ai.falanqeeSawir({ image: "data:image/png;base64,AA==" }),
    /non-empty image analysis prompt/
  );
  await assert.rejects(
    () => ai.sameeSawir({ prompt: " " }),
    /non-empty image generation prompt/
  );
  assert.throws(
    () => ai.ogaawLahjad({ text: "" }),
    /non-empty text/
  );
  assert.equal(ai.ogaawLahjad({ text: "Somali text" }).dialect, "unknown");
  await assert.rejects(
    () => ai.sameeSawir({ prompt: "Create an image" }),
    /does not implement the "image-generation" capability/
  );
});

test("structured JSON output is parsed and validated against its schema", async () => {
  const ai = createSomaliAI({ provider: "custom" });
  ai.providers.register("custom", {
    capabilities: ["structured-output"],
    generateStructured: async () => ({
      text: '{"name":"Ayaan","age":20}',
      provider: "custom",
      model: "structured-v1"
    })
  });
  const result = await ai.sooSaarJSON({
    prompt: "Extract a name and age.",
    schema: {
      type: "object",
      properties: { name: { type: "string" }, age: { type: "integer" } },
      required: ["name", "age"],
      additionalProperties: false
    }
  });
  assert.deepEqual(result.data, { name: "Ayaan", age: 20 });

  ai.providers.register("broken", {
    generateStructured: async () => ({ text: "not JSON" })
  });
  const broken = createSomaliAI({ provider: "broken" });
  broken.providers.register("broken", {
    capabilities: ["structured-output"],
    generateStructured: async () => ({ text: '{"name":42}' })
  });
  await assert.rejects(
    () => broken.sooSaarJSON({
      prompt: "Extract a name.",
      schema: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"]
      }
    }),
    /schema validation/
  );
});

test("knowledge search supports explicit local semantic retrieval with checked dimensions", async () => {
  const ai = createSomaliAI({ provider: "custom" });
  ai.providers.register("custom", {
    capabilities: ["embeddings"],
    createEmbedding: async ({ texts }) => ({
      embeddings: texts.map((text) =>
        text.includes("education") ? [1, 0] : [0, 1]
      )
    }),
    generate: async ({ prompt }) => ({
      text: prompt,
      provider: "custom",
      model: "text-model"
    })
  });
  const result = await ai.raadsoAqoon({
    question: "education",
    documents: [
      { id: "education", content: "education helps communities" },
      { id: "health", content: "health services support families" }
    ],
    strategy: "semantic",
    embeddingModel: "embedding-model"
  });
  assert.equal(result.sources[0].id, "education");
  assert.equal(result.sources[0].relevance, 1);

  await assert.rejects(
    () => ai.raadsoAqoon({
      question: "education",
      documents: [{ id: "education", content: "education helps communities" }],
      strategy: "semantic"
    }),
    /explicit embeddingModel/
  );
});

test("semantic search integrates an explicit external vector-store adapter", async () => {
  const ai = createSomaliAI({ provider: "custom" });
  ai.providers.register("custom", {
    capabilities: ["embeddings"],
    createEmbedding: async ({ texts }) => ({
      embeddings: texts.map(() => [1, 0])
    }),
    generate: async () => ({
      text: "Answer",
      provider: "custom",
      model: "text-model"
    })
  });
  let upserted;
  const vectorStore = {
    embeddingModel: "embedding-v1",
    dimensions: 2,
    upsert: async (records, metadata) => {
      upserted = { records, metadata };
    },
    search: async (vector, metadata) => {
      assert.deepEqual(vector, [1, 0]);
      assert.equal(metadata.embeddingModel, "embedding-v1");
      return [{
        id: "education:0",
        text: "Education helps communities.",
        score: 0.9,
        metadata: { documentId: "education", chunkIndex: 0 }
      }];
    }
  };
  const result = await ai.raadsoAqoon({
    question: "education",
    documents: [{ id: "education", content: "Education helps communities." }],
    strategy: "semantic",
    embeddingModel: "embedding-v1",
    vectorStore,
    indexDocuments: true
  });
  assert.equal(upserted.records[0].id, "education:0");
  assert.equal(upserted.metadata.dimensions, 2);
  assert.equal(result.sources[0].id, "education");

  await assert.rejects(
    () => ai.raadsoAqoon({
      question: "education",
      documents: [{ id: "education", content: "Education helps communities." }],
      strategy: "semantic",
      embeddingModel: "embedding-v1",
      vectorStore: { ...vectorStore, dimensions: 3 }
    }),
    /must match the configured embedding model/
  );
});

test("agent executes only registered tools with schema-checked arguments", async () => {
  let executions = 0;
  const ai = createSomaliAI({ provider: "custom" });
  ai.providers.register("custom", {
    capabilities: ["tool-calling"],
    generateWithTools: async ({ step }) => step === 1
      ? { toolCall: { name: "lookup", arguments: { query: "Somalia" } } }
      : { finalAnswer: "Somalia is in the Horn of Africa." }
  });
  const result = await ai.wakiilAI({
    task: "Answer from a lookup",
    tools: [{
      name: "lookup",
      schema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false
      },
      execute: async ({ query }) => {
        executions += 1;
        return `Found: ${query}`;
      }
    }]
  });
  assert.equal(result.answer, "Somalia is in the Horn of Africa.");
  assert.equal(executions, 1);
  assert.deepEqual(result.executionHistory, [
    { tool: "lookup", status: "completed" }
  ]);
});

test("agent requires approval for sensitive tools and blocks unregistered calls", async () => {
  const ai = createSomaliAI({ provider: "custom" });
  ai.providers.register("custom", {
    capabilities: ["tool-calling"],
    generateWithTools: async () => ({
      toolCall: { name: "send", arguments: {} }
    })
  });
  const tools = [{
    name: "send",
    schema: { type: "object", properties: {}, additionalProperties: false },
    requiresApproval: true,
    execute: async () => assert.fail("Approval is required")
  }];
  const approval = await ai.wakiilAI({ task: "Send", tools });
  assert.equal(approval.status, "approval_required");

  const denied = await ai.wakiilAI({
    task: "Send",
    tools,
    approve: async () => false,
    maxSteps: 1
  });
  assert.equal(denied.status, "max_steps_reached");
  assert.deepEqual(denied.executionHistory, [{ tool: "send", status: "denied" }]);
  await assert.rejects(
    () => ai.wakiilAI({ task: "Send", tools: [] }),
    /not explicitly provided/
  );

  const noAgent = createSomaliAI({ provider: "plain" });
  noAgent.providers.register("plain", { generate: async () => ({ text: "ok" }) });
  await assert.rejects(
    () => noAgent.wakiilAI({ task: "No tool support" }),
    /not implement the "tool-calling" capability/
  );
});
