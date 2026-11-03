import { createPromptInstructions } from "./prompt-instructions.js";

const defaultEndpoint = "/api/somali-ai";
const defaultTimeoutMs = 30_000;

export function validateConnectedGatewayEndpoint(endpoint) {
  if (endpoint === undefined) return defaultEndpoint;
  if (typeof endpoint !== "string" || !endpoint.trim()) {
    throw new Error("gatewayEndpoint must be a non-empty same-origin path or HTTPS URL.");
  }

  const value = endpoint.trim();
  if (value.startsWith("/") && !value.startsWith("//")) {
    const parsed = new URL(value, "https://somali-ai.invalid");
    if (
      !parsed.pathname.startsWith("/api/") ||
      parsed.pathname !== value ||
      parsed.search ||
      parsed.hash ||
      value.includes("\\")
    ) {
      throw new Error("gatewayEndpoint must be a same-origin /api/ path without a query or fragment.");
    }
    return value;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("gatewayEndpoint must be a same-origin path or valid absolute URL.");
  }
  const isLocalHttp = parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (
    (parsed.protocol !== "https:" && !isLocalHttp) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "gatewayEndpoint must use HTTPS (HTTP is allowed only for localhost) and must not contain credentials, query, or fragment."
    );
  }
  return parsed.toString().replace(/\/$/, "");
}

export function createConnectedGatewayProvider({
  provider,
  model,
  endpoint = defaultEndpoint,
  timeoutMs = defaultTimeoutMs,
  fetch: fetchImplementation = globalThis.fetch
}) {
  if (provider !== "gemini") {
    throw new Error('gateway: "connected" currently supports only the Gemini provider.');
  }
  if (typeof fetchImplementation !== "function") {
    throw new Error('gateway: "connected" requires fetch to reach a trusted Worker endpoint.');
  }
  if (typeof model !== "string" || !model.trim()) {
    throw new Error('gateway: "connected" requires a configured Gemini model.');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new Error("gatewayTimeoutMs must be an integer from 1 to 120000.");
  }

  async function generate({
    prompt,
    language = "automatic",
    systemPrompt,
    operationInstructions,
    signal
  }) {
    const controller = new AbortController();
    let timedOut = false;
    let timeout;
    const onAbort = () => controller.abort(signal.reason);

    if (signal?.aborted) {
      throw new Error("Connected Cloudflare Worker request was aborted.");
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const request = fetchImplementation(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider,
          model: model.startsWith("google/") ? model : `google/${model}`,
          prompt,
          instructions: createPromptInstructions({
            language,
            systemPrompt,
            operationInstructions
          })
        }),
        signal: controller.signal
      });
      const response = await Promise.race([
        request,
        new Promise((_, reject) => {
          timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(new Error("Connected Cloudflare Worker request timed out."));
          }, timeoutMs);
        })
      ]);

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Connected Cloudflare Worker returned invalid JSON (status ${response.status}).`
        );
      }

      if (!response.ok) {
        const message = data?.error?.message ||
          (typeof data?.error === "string" ? data.error : data?.message);
        throw new Error(
          `Connected Cloudflare Worker error: ${
            typeof message === "string" && message.trim()
              ? message
              : `request failed with status ${response.status}.`
          }`
        );
      }

      if (typeof data?.text !== "string" || !data.text.trim()) {
        throw new Error("Connected Cloudflare Worker returned no text response.");
      }

      return {
        text: data.text,
        provider,
        model,
        ...(data.usage ? { usage: data.usage } : {})
      };
    } catch (error) {
      if (timedOut) {
        throw new Error(`Connected Cloudflare Worker request timed out after ${timeoutMs} ms.`);
      }
      if (signal?.aborted) {
        throw new Error("Connected Cloudflare Worker request was aborted.");
      }
      if (error instanceof Error && (
        error.message.startsWith("Connected Cloudflare Worker") ||
        error.message === "gateway: \"connected\" currently supports only the Gemini provider."
      )) {
        throw error;
      }
      throw new Error("Could not reach the connected Cloudflare Worker.", { cause: error });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  return { generate };
}
