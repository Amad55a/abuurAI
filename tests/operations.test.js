import test from "node:test";
import assert from "node:assert/strict";
import { createSomaliAI } from "../src/index.js";

const operations = [
  ["turjun", ["Hello", "Somali"], "accurately and naturally into Somali"],
  ["sooKoob", ["A long text"], "Summarize the text"],
  ["sharax", ["Artificial intelligence"], "Explain the following text"],
  ["sax", ["A text with mistakes"], "Correct spelling and grammar"],
  ["dibUqor", ["Rewrite this"], "Rewrite the following text"],
  ["hagaaji", ["Improve this"], "Improve the clarity"],
  ["balaadhi", ["Expand this"], "Expand the following text"],
  ["qor", ["Write an article"], "Write the requested content"],
  ["curi", ["Create a story"], "Create original content"],
  ["fikrado", ["Somali food"], "Generate a useful list"],
  ["cinwaan", ["An article"], "Generate several concise"],
  ["sameeSuaalo", ["A passage"], "Generate useful questions"],
  ["falanqee", ["Some text"], "Analyze the following text"],
  ["kalaSaar", ["Some text", ["news", "opinion"]], "Classify the following text"],
  ["dareen", ["I am very happy"], "Analyze the sentiment"],
  ["sooSaarXog", ["A report"], "Extract the important information"],
  ["isbarbarDhig", [["One item", "Another item"]], "Compare the following items"],
  ["qorCode", ["Create a JavaScript calculator"], "Write code"],
  ["sharaxCode", ["const value = 1;"], "Explain what this code does"],
  ["saxCode", ["const = ;"], "Find and fix errors"],
  ["dibUhabeeCode", ["function example() {}"], "Refactor this code"]
];

for (const providerName of ["openai", "gemini"]) {
  for (const [method, args, expectedPrompt] of operations) {
    test(`${method} works through the ${providerName} SDK provider`, async () => {
      let request;
      const ai = createSomaliAI({ provider: providerName });
      ai.providers.register(providerName, {
        generate: async (receivedRequest) => {
          request = receivedRequest;
          return { text: "fake response", provider: providerName };
        }
      });

      const result = await ai[method](...args);

      assert.equal(request.language, method === "turjun" ? "Somali" : "automatic");
      assert.match(request.prompt, new RegExp(expectedPrompt));
      assert.equal(result.text, "fake response");
      assert.equal(result.provider, providerName);
    });
  }
}

test("text methods accept language options and preserve provider responses", async () => {
  let request;
  const ai = createSomaliAI({ provider: "fake" });
  const expected = { text: "Waa la soo koobay", extra: true };
  ai.providers.register("fake", {
    generate: async (receivedRequest) => {
      request = receivedRequest;
      return expected;
    }
  });

  assert.equal(await ai.sooKoob("Qoraal", { language: "Somali" }), expected);
  assert.equal(request.language, "Somali");
});

for (const providerName of ["openai", "gemini"]) {
  test(`turjun requests natural Somali-only translations from ${providerName}`, async () => {
    let request;
    const expected = { text: "Salaan, sidee tahay?", provider: providerName };
    const ai = createSomaliAI({ provider: providerName });
    ai.providers.register(providerName, {
      generate: async (receivedRequest) => {
        request = receivedRequest;
        return expected;
      }
    });

    const result = await ai.turjun("Hello, how are you?", "Somali");

    assert.match(request.prompt, /accurately and naturally into Somali/);
    assert.match(request.prompt, /natural, standard Somali spelling and grammar/);
    assert.match(request.prompt, /"Salaan, sidee tahay\?"/);
    assert.match(request.prompt, /do not use misspellings such as "Silamaha"/);
    assert.match(request.prompt, /Return only the translated text/);
    assert.match(request.prompt, /Do not include an explanation, introduction, notes, or alternative translations/);
    assert.match(request.prompt, /Hello, how are you\?/);
    assert.equal(request.language, "Somali");
    assert.equal(result, expected);
  });
}

test("text methods reject invalid input", async () => {
  const ai = createSomaliAI({ provider: "fake" });
  ai.providers.register("fake", { generate: async () => ({ text: "unused" }) });

  await assert.rejects(() => ai.sooKoob(""), /valid text/);
  await assert.rejects(() => ai.turjun("Hello", ""), /target language/);
  await assert.rejects(() => ai.kalaSaar("Text", [""]), /Categories/);
  await assert.rejects(() => ai.isbarbarDhig(["Only one"]), /at least two/);
});

test("conversation methods retain context and nadiifi clears it", async () => {
  const prompts = [];
  const ai = createSomaliAI({ provider: "fake" });
  ai.providers.register("fake", {
    generate: async ({ prompt }) => {
      prompts.push(prompt);
      return { text: `Answer ${prompts.length}` };
    }
  });

  await assert.rejects(() => ai.siiWad("Continue"), /no conversation/);
  await ai.wadaSheekeysi("First question");
  await ai.siiWad("Follow-up question");
  assert.match(prompts[1], /User: First question\nAssistant: Answer 1/);
  assert.match(prompts[1], /User: Follow-up question/);

  assert.equal(ai.nadiifi(), true);
  await assert.rejects(() => ai.siiWad("Continue"), /no conversation/);
  await ai.wadaSheekeysi("New conversation");
  assert.equal(prompts[2], "New conversation");
});
