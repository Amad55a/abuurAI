
import { test } from "node:test";
import assert from "node:assert/strict";

import { handleError } from "../src/utils/handle-error.js";

test("handles invalid API keys", () => {
  assert.throws(
    () => handleError({ status: 401 }, "OpenAI"),
    /OpenAI: Invalid API key/
  );
});

test("handles exhausted API credits", () => {
  assert.throws(
    () => handleError({ status: 429 }, "Gemini"),
    /Gemini: API limit or credits exceeded/
  );
});

test("handles network errors", () => {
  assert.throws(
    () => handleError({ code: "ENOTFOUND" }, "OpenAI"),
    /OpenAI: Network connection failed/
  );
});

test("handles unexpected errors", () => {
  assert.throws(
    () => handleError({ message: "Something went wrong" }, "Gemini"),
    /Gemini: Something went wrong/
  );
});
