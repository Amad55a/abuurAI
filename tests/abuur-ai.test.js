import test from "node:test";
import assert from "node:assert/strict";
import { abuurAI, createSomaliAI } from "../src/index.js";
import { abuurAI as browserAbuurAI } from "../src/browser.js";

test("abuurAI is the primary Node export and legacy constructor remains an alias", () => {
  assert.equal(typeof abuurAI, "function");
  assert.equal(createSomaliAI, abuurAI);
  assert.deepEqual(abuurAI().getProviders(), []);
});

test("Somali configuration names select a provider, model, key, and global instructions", async () => {
  let request;
  const ai = abuurAI({
    bixiye: "fake",
    furahaAPI: "fake-api-key",
    moodel: "fake-model",
    tilmaamo: "Ku jawaab Af-Soomaali."
  });
  ai.providers.register("fake", {
    model: "fake-model",
    generate: async (receivedRequest) => {
      request = receivedRequest;
      return { text: "Jawaab." };
    }
  });

  const answer = await ai.weydii("Salaan!");

  assert.equal(answer.text, "Jawaab.");
  assert.equal(request.prompt, "Salaan!");
  assert.equal(request.systemPrompt, "Ku jawaab Af-Soomaali.");
  assert.equal(ai.getConfig().provider, "fake");
  assert.equal(ai.getConfig().model, "fake-model");
  assert.equal(JSON.stringify(ai.getConfig()).includes("fake-api-key"), false);
});

test("Node entry passes Somali configuration to Gemini and OpenAI adapters", async () => {
  const requests = [];
  const ai = abuurAI({
    bixiye: "gemini",
    furahaAPI: "fake-node-key",
    moodel: "gemini-test",
    tilmaamo: "Ku jawaab Af-Soomaali.",
    providers: {
      gemini: {
        client: {
          models: {
            generateContent: async (request) => {
              requests.push({ provider: "gemini", request });
              return { text: "Jawaab Gemini." };
            }
          }
        }
      },
      openai: {
        furahaAPI: "fake-openai-key",
        moodel: "openai-test",
        client: {
          responses: {
            create: async (request) => {
              requests.push({ provider: "openai", request });
              return { output_text: "Jawaab OpenAI." };
            }
          }
        }
      }
    }
  });

  assert.equal((await ai.weydii("Su'aal")).text, "Jawaab Gemini.");
  assert.equal((await ai.weydii("Su'aal", { bixiye: "openai" })).text, "Jawaab OpenAI.");
  assert.equal(requests[0].request.model, "gemini-test");
  assert.equal(requests[0].request.config.systemInstruction.includes("Ku jawaab Af-Soomaali."), true);
  assert.equal(requests[1].request.model, "openai-test");
  assert.equal(requests[1].request.instructions.includes("Ku jawaab Af-Soomaali."), true);
});

test("Somali per-call provider, model selection, and instructions are accepted", async () => {
  const requests = [];
  const ai = abuurAI({ bixiye: "gemini", furahaAPI: "fake-key", moodel: "gemini-test" });
  for (const name of ["gemini", "openai"]) {
    ai.providers.register(name, {
      model: `${name}-test`,
      generate: async (request) => {
        requests.push({ name, request });
        return { text: "OK", provider: name };
      }
    });
  }

  const result = await ai.weydii("Su'aal", {
    bixiye: "openai",
    moodel: "openai-test",
    tilmaamo: "Tilmaamo gaar ah."
  });

  assert.equal(result.provider, "openai");
  assert.equal(requests[0].request.systemPrompt, "Tilmaamo gaar ah.");
  assert.equal(ai.doorModel({ bixiye: "gemini", moodel: "gemini-test" }).provider, "gemini");
  assert.equal(ai.awoodahaModelka({ bixiye: "openai" }).providers[0].provider, "openai");
  const translation = await ai.turjun("Hello", "Somali", {
    bixiye: "gemini",
    tilmaamo: "Turjun dabiici ah."
  });
  assert.equal(translation.provider, "gemini");
  assert.equal(requests[1].request.systemPrompt, "Turjun dabiici ah.");
});

test("Somali provider-specific keys and model IDs normalize correctly", () => {
  const ai = abuurAI({
    mode: "auto",
    providers: {
      gemini: { furahaAPI: "fake-gemini-key", moodel: "gemini-test" },
      openai: { furahaAPI: "fake-openai-key", moodel: "openai-test" }
    }
  });

  test("per-call tilmaamo applies to conversations and streaming", async () => {
    const requests = [];
    const ai = abuurAI({ bixiye: "fake" });
    ai.providers.register("fake", {
      generate: async (request) => {
        requests.push(request);
        return { text: "Jawaab." };
      },
      async *stream(request) {
        requests.push(request);
        yield { text: "Jawaab." };
      }
    });

    await ai.wadaSheekeysi("Salaan", { tilmaamo: "Tilmaamaha wada sheekaysiga." });
    for await (const _chunk of ai.qulqul({
      prompt: "Salaan",
      tilmaamo: "Tilmaamaha qulqulka."
    })) {}

    assert.equal(requests[0].systemPrompt, "Tilmaamaha wada sheekaysiga.");
    assert.equal(requests[1].systemPrompt, "Tilmaamaha qulqulka.");
  });

  assert.equal(ai.doorModel({ task: "conversation", bixiye: "openai" }).provider, "openai");
  assert.equal(ai.doorModel({ task: "conversation", bixiye: "openai", moodel: "openai-test" }).model, "openai-test");
});

test("conflicting Somali and compatibility configuration names fail clearly", () => {
  assert.throws(
    () => abuurAI({ bixiye: "gemini", provider: "openai" }),
    /bixiye or its compatibility alias/
  );
  assert.throws(
    () => abuurAI({ tilmaamo: "Somali", systemPrompt: "English" }),
    /tilmaamo or its compatibility alias/
  );
});

test("browser entry exports the Somali constructor independently", async () => {
  let request;
  const ai = browserAbuurAI({
    bixiye: "gemini",
    furahaAPI: "fake-browser-key",
    moodel: "gemini-2.5-flash",
    tilmaamo: "Ku jawaab Af-Soomaali.",
    fetch: async (url, init) => {
      request = { url: String(url), body: JSON.parse(init.body) };
      return Response.json({
        candidates: [{ content: { parts: [{ text: "Salaan." }] } }]
      });
    }
  });

  const answer = await ai.weydii("Salaan!");

  assert.equal(answer.text, "Salaan.");
  assert.match(request.url, /gemini-2\.5-flash:generateContent$/);
  assert.match(request.body.systemInstruction.parts[0].text, /Ku jawaab Af-Soomaali\./);
});
