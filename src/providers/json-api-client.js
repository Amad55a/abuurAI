import { handleError } from "../utils/handle-error.js";
import { createPromptInstructions } from "./prompt-instructions.js";

export function getProviderConfig(options, provider, environmentVariable) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error(`${provider} provider options must be an object.`);
  }

  const apiKey = options.apiKey ?? process.env[environmentVariable];

  if (apiKey !== undefined && (typeof apiKey !== "string" || !apiKey.trim())) {
    throw new Error(`${provider} API key must be a non-empty string.`);
  }

  if (!apiKey) {
    throw new Error(`${provider} API key is required.`);
  }

  if (typeof options.model !== "string" || !options.model.trim()) {
    throw new Error(`Please specify a ${provider} model.`);
  }

  const fetchImplementation = options.fetch || globalThis.fetch;
  if (typeof fetchImplementation !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  return {
    apiKey,
    model: options.model,
    fetchImplementation
  };
}

export function createJsonRequester(provider, apiKey, fetchImplementation) {
  return async function postJson(url, payload, headers = {}) {
    let response;

    try {
      response = await fetchImplementation(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...headers
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      handleError(error, provider, apiKey);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      handleError(
        {
          status: response.status,
          message: response.ok
            ? "The API returned an invalid JSON response."
            : `The API request failed with status ${response.status}.`
        },
        provider,
        apiKey
      );
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error?.type ||
        data?.message ||
        `The API request failed with status ${response.status}.`;

      handleError(
        { status: response.status, message },
        provider,
        apiKey
      );
    }

    return data;
  };
}

function abortError() {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function readWithAbort(reader, signal) {
  if (!signal) {
    return reader.read();
  }
  if (signal.aborted) {
    return Promise.reject(abortError());
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(abortError());
      reader.cancel().then(
        () => {},
        (error) => {
          if (!settled) {
            reject(error);
          }
        }
      );
    };
    signal.addEventListener("abort", onAbort, { once: true });

    reader.read().then(
      (result) => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(result);
        }
      },
      (error) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
        }
      }
    );
  });
}

export async function* createSseRequester(
  provider,
  apiKey,
  fetchImplementation,
  url,
  payload,
  headers = {},
  signal
) {
  let response;
  try {
    response = await fetchImplementation(url, {
      method: "POST",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
        ...headers
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch (error) {
    if (signal?.aborted) {
      throw abortError();
    }
    handleError(error, provider, apiKey);
  }

  if (!response.ok) {
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    handleError(
      {
        status: response.status,
        message:
          data?.error?.message ||
          data?.error?.type ||
          data?.message ||
          `The API request failed with status ${response.status}.`
      },
      provider,
      apiKey
    );
  }

  if (!response.body?.getReader) {
    throw new Error(`${provider}: The streaming response has no readable body.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  async function* parseEvents() {
    while (true) {
      if (signal?.aborted) {
        throw abortError();
      }

      const { done, value } = await readWithAbort(reader, signal);
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";

      for (const rawEvent of events) {
        const data = rawEvent
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (!data || data === "[DONE]") {
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          handleError(
            { message: "The API returned an invalid streaming event." },
            provider,
            apiKey
          );
        }

        if (parsed.type === "error" || parsed.error) {
          handleError(
            {
              status: parsed.error?.status || parsed.status,
              message:
                parsed.error?.message ||
                parsed.message ||
                "The provider reported a streaming error."
            },
            provider,
            apiKey
          );
        }

        yield parsed;
      }

      if (done) {
        if (buffer.trim()) {
          const data = buffer
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .join("\n");
          if (data && data !== "[DONE]") {
            try {
              yield JSON.parse(data);
            } catch {
              handleError(
                { message: "The API returned an invalid streaming event." },
                provider,
                apiKey
              );
            }
          }
        }
        return;
      }
    }
  }

  try {
    for await (const event of parseEvents()) {
      yield event;
    }
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") {
      throw abortError();
    }
    if (error?.message?.startsWith(`${provider}:`)) {
      throw error;
    }
    handleError(error, provider, apiKey);
  } finally {
    if (signal?.aborted) {
      try {
        await reader.cancel();
      } catch (error) {
        if (error?.name !== "AbortError") {
          throw error;
        }
      }
    }
    reader.releaseLock();
  }
}

export function extractChatCompletionText(response, provider) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`${provider}: The API returned no text response.`);
  }

  return content;
}

function normalizeTokenUsage(usage) {
  const inputTokens = usage?.prompt_tokens ?? usage?.input_tokens;
  const outputTokens = usage?.completion_tokens ?? usage?.output_tokens;
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) {
    return undefined;
  }
  return { inputTokens, outputTokens };
}

export function createChatCompletionStream({
  provider,
  apiKey,
  model,
  fetchImplementation,
  endpoint
}) {
  return async function* stream({
    prompt,
    language = "automatic",
    systemPrompt,
    operationInstructions,
    signal
  }) {
    const instructions = createPromptInstructions({
      language,
      systemPrompt,
      operationInstructions
    });

    for await (const event of createSseRequester(
      provider,
      apiKey,
      fetchImplementation,
      endpoint,
      {
        model,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: prompt }
        ],
        stream: true
      },
      { authorization: `Bearer ${apiKey}` },
      signal
    )) {
      const text = event?.choices?.[0]?.delta?.content;
      if (typeof text === "string" && text) {
        yield { text, provider, model };
      }

      const usage = normalizeTokenUsage(event?.usage);
      if (usage) {
        yield { text: "", provider, model, usage };
      }
    }
  };
}

export function createChatCompletionRequest(model, instructions, prompt) {
  return {
    model,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: prompt }
    ]
  };
}
