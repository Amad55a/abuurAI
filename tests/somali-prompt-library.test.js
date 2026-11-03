import test from "node:test";
import assert from "node:assert/strict";
import {
  getSomaliPromptTemplate,
  renderSomaliPromptTemplate,
  somaliPromptTemplates
} from "../src/index.js";
import * as browserSdk from "../src/browser.js";

test("SDK exposes eight reusable Somali prompt templates", () => {
  assert.equal(somaliPromptTemplates.length, 8);
  assert.deepEqual(
    somaliPromptTemplates.map(({ id }) => id),
    [
      "somali-assistant",
      "writing",
      "translation",
      "education",
      "coding",
      "question-answer",
      "business",
      "research"
    ]
  );
  assert.equal(browserSdk.somaliPromptTemplates, somaliPromptTemplates);
  assert.equal(browserSdk.renderSomaliPromptTemplate, renderSomaliPromptTemplate);
});

test("template rendering uses supplied prompts and respects explicit language requests", () => {
  const prompt = renderSomaliPromptTemplate("education", {
    prompt: "Waa maxay tamarta qorraxdu?"
  });
  assert.match(prompt, /Waa maxay tamarta qorraxdu\?/);
  assert.match(prompt, /luqad kale/);
  assert.match(
    renderSomaliPromptTemplate("translation", {
      prompt: "Subax wanaagsan",
      targetLanguage: "English"
    }),
    /English/
  );
  assert.equal(
    renderSomaliPromptTemplate("somali-assistant", { prompt: "  Salaan  " })
      .endsWith("Su'aal: Salaan"),
    true
  );
});

test("prompt templates are immutable and reject invalid IDs or empty input", () => {
  assert.ok(Object.isFrozen(somaliPromptTemplates));
  assert.ok(Object.isFrozen(getSomaliPromptTemplate("coding")));
  assert.throws(() => getSomaliPromptTemplate("not-a-template"), /Unknown Somali prompt template/);
  assert.throws(() => renderSomaliPromptTemplate("coding", { prompt: " " }), /Provide text/);
});
