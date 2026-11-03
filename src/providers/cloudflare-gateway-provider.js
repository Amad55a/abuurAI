import { createPromptInstructions } from "./prompt-instructions.js";

function getErrorMessage(data, status) {
  const message = data?.error?.message ||
    (typeof data?.error === "string" ? data.error : data?.message);
  return typeof message === "string" && message.trim()
    ? message
    : `The Worker request failed with status ${status}.`;
}

export function createCloudflareGatewayProvider({
  gateway,
  provider,
  model,
  fetch: fetchImplementation = globalThis.fetch
}) {
  if (typeof fetchImplementation !== "function") {
    throw new Error("A fetch implementation is required for Cloudflare gateway mode.");
  }

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
      response = await fetchImplementation(gateway.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: gateway.accountId,
          gatewayId: gateway.gatewayId,
          provider,
          model,
          prompt,
          instructions
        })
      });
    } catch (error) {
      throw new Error(
        `Cloudflare gateway request failed: ${error?.message || "Network error."}`,
        { cause: error }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        `Cloudflare gateway returned an invalid JSON response (status ${response.status}).`
      );
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(data, response.status));
    }

    if (typeof data?.text !== "string" || !data.text.trim()) {
      throw new Error("Cloudflare gateway returned no text response.");
    }

    return {
      text: data.text,
      provider: data.provider || provider,
      model: data.model || model,
      ...(data.usage ? { usage: data.usage } : {})
    };
  }

  return { generate };
}
