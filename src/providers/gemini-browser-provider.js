import { createPromptInstructions } from "./prompt-instructions.js";

function getErrorMessage(data, status, apiKey) {
  const message = data?.error?.message || data?.message;
  const safeMessage = typeof message === "string"
    ? message.replaceAll(apiKey, "[redacted]").replace(/[\u0000-\u001f\u007f]/g, " ").trim()
    : "";
  return safeMessage || `Gemini request failed with status ${status}.`;
}

export function createGeminiBrowserProvider({
  apiKey,
  model = "gemini-2.5-flash",
  fetch: fetchImplementation = globalThis.fetch
} = {}) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error(
      "Gemini API key is required. Browser keys are public; use only a restricted test key or a server-side provider."
    );
  }
  if (typeof model !== "string" || !model.trim()) {
    throw new Error("Please specify a Gemini model.");
  }
  if (typeof fetchImplementation !== "function") {
    throw new Error("A fetch implementation is required for browser Gemini mode.");
  }

  const normalizedKey = apiKey.trim();
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  async function generate({
    prompt,
    language = "automatic",
    systemPrompt,
    operationInstructions
  }) {
    const instructions = createPromptInstructions({
      language,
      systemPrompt,
      operationInstructions
    });

    let response;
    try {
      response = await fetchImplementation(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": normalizedKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      });
    } catch {
      throw new Error("Gemini request failed. Check the network and try again.");
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Gemini returned an invalid response (status ${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(getErrorMessage(data, response.status, normalizedKey));
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.filter((part) => typeof part?.text === "string")
      .map((part) => part.text)
      .join("");
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("Gemini returned no text response.");
    }

    const result = { text, provider: "gemini", model };
    const usage = data.usageMetadata;
    if (Number.isFinite(usage?.promptTokenCount) &&
      Number.isFinite(usage?.candidatesTokenCount)) {
      result.usage = {
        inputTokens: usage.promptTokenCount,
        outputTokens: usage.candidatesTokenCount
      };
    }
    return result;
  }

  return { generate };
}
