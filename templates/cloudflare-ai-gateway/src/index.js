import {
  extractText,
  readBoundedJson,
  validatePayload
} from "./worker-utils.js";

function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

function jsonError(code, message, status, headers = {}) {
  return jsonResponse({ error: { code, message } }, status, headers);
}

function allowedOrigins(env) {
  if (typeof env.ALLOWED_ORIGINS !== "string" || !env.ALLOWED_ORIGINS.trim()) {
    return [];
  }
  return env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
}

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}

function upstreamErrors(output) {
  const nested = Array.isArray(output?.error)
    ? output.error
    : output?.error && typeof output.error === "object"
      ? [output.error]
      : [];
  return [
    ...nested,
    ...(Array.isArray(output?.errors) ? output.errors : [])
  ].filter((error) => error && typeof error === "object");
}

function checkOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins(env).includes(origin)) {
    return null;
  }
  return origin;
}

function isGoogleCredentialError(output) {
  const errors = upstreamErrors(output);
  if (!errors.length) {
    return false;
  }
  const reasons = errors.flatMap((error) => [
    error.status,
    error.code,
    ...(Array.isArray(error.details)
      ? error.details.flatMap((detail) => [
        detail?.reason,
        detail?.metadata?.reason
      ])
      : [])
  ]).filter((value) => typeof value === "string");
  if (reasons.some((reason) =>
    /^(API_KEY_INVALID|API_KEY_SERVICE_BLOCKED|API_KEY_HTTP_REFERRER_BLOCKED|API_KEY_IP_ADDRESS_BLOCKED|API_KEY_ANDROID_APP_BLOCKED|API_KEY_IOS_APP_BLOCKED)$/
      .test(reason)
  )) {
    return true;
  }
  return errors.some((error) => typeof error.message === "string" &&
    /\b(?:api[\s_-]*key\s+(?:is\s+)?not\s+valid|invalid\s+api[\s_-]*key)\b/i
      .test(error.message));
}

function getUpstreamErrorSource(output) {
  if (isGoogleCredentialError(output)) {
    return "google_provider_credentials";
  }
  if (upstreamErrors(output).some((error) => String(error.code) === "2009")) {
    return "cloudflare_gateway_authentication";
  }
  const possibleMessages = [
    output?.message,
    ...upstreamErrors(output).map((error) => error.message)
  ].filter((value) => typeof value === "string");
  if (possibleMessages.some((message) =>
    /\b(?:cf-aig-authorization|gateway authentication token|ai gateway authentication)\b/i
      .test(message)
  )) {
    return "cloudflare_gateway_authentication";
  }
  return "unknown";
}

function getSafeUpstreamErrorMetadata(output, secretValues = []) {
  const shape = [];
  if (output && typeof output === "object" && !Array.isArray(output)) {
    for (const key of ["success", "error", "errors", "message", "code", "status"]) {
      if (Object.hasOwn(output, key)) {
        const value = output[key];
        const kind = value === null ? "null" : Array.isArray(value)
          ? "array"
          : typeof value;
        shape.push(`${key}:${kind}`);
      }
    }
    for (const [index, error] of upstreamErrors(output).entries()) {
      if (index >= 5) break;
      shape.push(`error[${index}]:object`);
      for (const key of ["code", "status", "message", "details"]) {
        if (Object.hasOwn(error, key)) {
          const value = error[key];
          const kind = value === null ? "null" : Array.isArray(value)
            ? "array"
            : typeof value;
          shape.push(`error[${index}].${key}:${kind}`);
        }
      }
    }
  }
  const errors = upstreamErrors(output);
  const safeValue = (value) => {
    if (typeof value === "number" && Number.isInteger(value)) {
      return String(value);
    }
    return typeof value === "string" &&
      !secretValues.some((secret) => secret && value.includes(secret)) &&
      /^[A-Za-z0-9_.-]{1,80}$/.test(value)
      ? value
      : undefined;
  };
  const codes = [...new Set(errors.map((error) => safeValue(error.code))
    .filter(Boolean))].slice(0, 5);
  const statuses = [...new Set(errors.map((error) => safeValue(error.status))
    .filter(Boolean))].slice(0, 5);
  const reasons = [...new Set(errors.flatMap((error) =>
    Array.isArray(error.details)
      ? error.details.flatMap((detail) => [
        safeValue(detail?.reason),
        safeValue(detail?.metadata?.reason)
      ])
      : []
  ).filter(Boolean))].slice(0, 5);
  const messages = [
    output?.message,
    ...upstreamErrors(output).map((error) => error.message)
  ].filter((value) => typeof value === "string");
  const messageCategory = messages.some((message) =>
    /^(?:unauthorized|unauthorized request|authentication required)$/i.test(message.trim())
  )
    ? "generic_unauthorized"
    : undefined;
  return {
    ...(shape.length ? { upstreamErrorShape: shape } : {}),
    ...(codes.length ? { upstreamErrorCodes: codes } : {}),
    ...(statuses.length ? { upstreamErrorStatuses: statuses } : {}),
    ...(reasons.length ? { upstreamErrorReasons: reasons } : {}),
    ...(messageCategory ? { upstreamErrorMessageCategory: messageCategory } : {})
  };
}

function googleAIStudioError(status, output, headers) {
  const source = getUpstreamErrorSource(output);
  if ((status === 400 || status === 401 || status === 403) &&
      source === "google_provider_credentials") {
    return {
      code: "GOOGLE_AI_STUDIO_CREDENTIALS_REJECTED",
      response: jsonError(
        "GOOGLE_AI_STUDIO_CREDENTIALS_REJECTED",
        "Google AI Studio rejected its stored provider credential or its access policy.",
        502,
        headers
      )
    };
  }
  if (status === 401 && source === "cloudflare_gateway_authentication") {
    return {
      code: "AI_GATEWAY_AUTH_FAILED",
      response: jsonError(
        "AI_GATEWAY_AUTH_FAILED",
        "Cloudflare AI Gateway rejected its authentication token. Verify CF_AIG_TOKEN is a current token for this account with AI Gateway Run permission.",
        502,
        headers
      )
    };
  }
  if (status === 401) {
    return {
      code: "UPSTREAM_AUTH_SOURCE_UNKNOWN",
      response: jsonError(
        "UPSTREAM_AUTH_SOURCE_UNKNOWN",
        "The upstream endpoint returned HTTP 401, but its response did not identify whether Gateway or provider authentication failed.",
        502,
        headers
      )
    };
  }
  if (status === 403) {
    return {
      code: "AI_GATEWAY_ACCESS_DENIED",
      response: jsonError(
        "AI_GATEWAY_ACCESS_DENIED",
        "Cloudflare AI Gateway denied access. Check the token's Gateway Run permission and gateway authentication settings.",
        502,
        headers
      )
    };
  }
  if (status === 402) {
    return {
      code: "AI_GATEWAY_BILLING_FAILED",
      response: jsonError(
        "AI_GATEWAY_BILLING_FAILED",
        "Cloudflare AI Gateway could not process this request due to a billing or provider-credential requirement.",
        502,
        headers
      )
    };
  }
  if (status === 404) {
    return {
      code: "MODEL_NOT_FOUND",
      response: jsonError(
        "MODEL_NOT_FOUND",
        "Google AI Studio did not find the requested model.",
        404,
        headers
      )
    };
  }
  if (status === 429) {
    return {
      code: "AI_GATEWAY_RATE_LIMITED",
      response: jsonError(
        "AI_GATEWAY_RATE_LIMITED",
        "Cloudflare AI Gateway or Google AI Studio rate limit was reached.",
        429,
        headers
      )
    };
  }
  if (status === 400 || status === 422) {
    return {
      code: "GOOGLE_AI_STUDIO_REQUEST_REJECTED",
      response: jsonError(
        "GOOGLE_AI_STUDIO_REQUEST_REJECTED",
        "Google AI Studio rejected the request. Check the model and request format.",
        422,
        headers
      )
    };
  }
  return {
    code: "AI_GATEWAY_INFERENCE_FAILED",
    response: jsonError(
      "AI_GATEWAY_INFERENCE_FAILED",
      "Google AI Studio inference through Cloudflare AI Gateway failed.",
      502,
      headers
    )
  };
}

async function generateWithGoogleAIStudio({
  env,
  model,
  prompt,
  instructions,
  provider,
  headers
}) {
  const endpoint = new URL(
    `https://gateway.ai.cloudflare.com/v1/${encodeURIComponent(env.ACCOUNT_ID)}/${encodeURIComponent(env.GATEWAY_ID)}/google-ai-studio/v1/models/${encodeURIComponent(model)}:generateContent`
  );
  const requestHeaders = { "content-type": "application/json" };
  const gatewayToken = typeof env.CF_AIG_TOKEN === "string"
    ? env.CF_AIG_TOKEN.trim().replace(/^Bearer\s+/i, "")
    : "";
  if (!gatewayToken) {
    return jsonError(
      "AI_GATEWAY_TOKEN_MISSING",
      "The Cloudflare AI Gateway Run token is not configured on this Worker.",
      503,
      headers
    );
  }
  requestHeaders["cf-aig-authorization"] = `Bearer ${gatewayToken}`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: instructions }]
        },
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      })
    });
  } catch (error) {
    const errorName = typeof error?.name === "string" &&
      /^[A-Za-z][A-Za-z0-9]{0,40}$/.test(error.name)
      ? error.name
      : "Error";
    console.error("Google AI Studio gateway request failed", {
      provider,
      model,
      name: errorName
    });
    return jsonError(
      "AI_GATEWAY_UNREACHABLE",
      "Could not reach Google AI Studio through Cloudflare AI Gateway.",
      502,
      headers
    );
  }

  let output;
  try {
    output = await response.json();
  } catch {
    output = null;
  }

  if (!response.ok) {
    const mappedError = googleAIStudioError(
      response.status,
      output,
      headers
    );
    const rawRayId = response.headers.get("cf-ray");
    const rayId = rawRayId && /^[A-Za-z0-9-]{1,128}$/.test(rawRayId)
      ? rawRayId
      : undefined;
    const rawContentType = response.headers.get("content-type");
    const contentType = rawContentType &&
      /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+(?:\s*;\s*charset=[A-Za-z0-9_-]+)?$/i
        .test(rawContentType)
      ? rawContentType
      : undefined;
    const server = response.headers.get("server");
    const safeServer = server && /^[A-Za-z0-9._-]{1,64}$/.test(server)
      ? server
      : undefined;
    console.error("Google AI Studio gateway request failed", {
      provider,
      model,
      status: response.status,
      diagnosticCode: mappedError.code,
      upstreamErrorSource: getUpstreamErrorSource(output),
      ...getSafeUpstreamErrorMetadata(output, [
        env.CF_AIG_TOKEN
      ]),
      ...(contentType ? { upstreamContentType: contentType } : {}),
      hasWwwAuthenticate: response.headers.has("www-authenticate"),
      ...(safeServer ? { upstreamServer: safeServer } : {}),
      ...(rayId ? { cloudflareRayId: rayId } : {})
    });
    return mappedError.response;
  }

  const text = extractText(output);
  if (typeof text !== "string" || !text.trim()) {
    return jsonError(
      "AI_INVALID_PROVIDER_RESPONSE",
      "Google AI Studio returned no text response.",
      502,
      headers
    );
  }
  return jsonResponse({ text, provider, model }, 200, headers);
}

function openRouterError(status, output, headers) {
  const gatewayAuthenticationFailed = upstreamErrors(output)
    .some((error) => String(error.code) === "2009");
  if (status === 401 && gatewayAuthenticationFailed) {
    return {
      code: "AI_GATEWAY_AUTH_FAILED",
      response: jsonError(
        "AI_GATEWAY_AUTH_FAILED",
        "Cloudflare AI Gateway rejected CF_AIG_TOKEN. Verify it is a current token for this account with AI Gateway Run permission, then restart Wrangler to reload .dev.vars.",
        502,
        headers
      )
    };
  }
  if (status === 401) {
    return {
      code: "OPENROUTER_AUTH_FAILED",
      response: jsonError(
        "OPENROUTER_AUTH_FAILED",
        "Cloudflare AI Gateway or OpenRouter rejected authentication. Verify the Worker Run token and the configured OpenRouter BYOK key and alias.",
        502,
        headers
      )
    };
  }
  if (status === 403) {
    return {
      code: "OPENROUTER_ACCESS_DENIED",
      response: jsonError(
        "OPENROUTER_ACCESS_DENIED",
        "OpenRouter denied access to the requested model or account.",
        502,
        headers
      )
    };
  }
  if (status === 402) {
    return {
      code: "OPENROUTER_BILLING_FAILED",
      response: jsonError(
        "OPENROUTER_BILLING_FAILED",
        "OpenRouter could not process the request due to an account or provider billing restriction.",
        502,
        headers
      )
    };
  }
  if (status === 404) {
    return {
      code: "OPENROUTER_MODEL_NOT_FOUND",
      response: jsonError(
        "OPENROUTER_MODEL_NOT_FOUND",
        "OpenRouter did not find the requested model.",
        404,
        headers
      )
    };
  }
  if (status === 429) {
    return {
      code: "OPENROUTER_RATE_LIMITED",
      response: jsonError(
        "OPENROUTER_RATE_LIMITED",
        "OpenRouter or the selected provider rate limit was reached.",
        429,
        headers
      )
    };
  }
  if (status === 400 || status === 422) {
    return {
      code: "OPENROUTER_REQUEST_REJECTED",
      response: jsonError(
        "OPENROUTER_REQUEST_REJECTED",
        "OpenRouter rejected the model or chat-completions request.",
        422,
        headers
      )
    };
  }
  return {
    code: "OPENROUTER_INFERENCE_FAILED",
    response: jsonError(
      "OPENROUTER_INFERENCE_FAILED",
      "OpenRouter inference through Cloudflare AI Gateway failed.",
      502,
      headers
    )
  };
}

async function generateWithOpenRouter({
  env,
  model,
  prompt,
  instructions,
  provider,
  headers
}) {
  const gatewayToken = typeof env.CF_AIG_TOKEN === "string"
    ? env.CF_AIG_TOKEN.trim().replace(/^Bearer\s+/i, "")
    : "";
  if (!gatewayToken) {
    return jsonError(
      "AI_GATEWAY_TOKEN_MISSING",
      "The Cloudflare AI Gateway Run token is not configured on this Worker.",
      503,
      headers
    );
  }

  const alias = typeof env.OPENROUTER_BYOK_ALIAS === "string"
    ? env.OPENROUTER_BYOK_ALIAS.trim()
    : "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(alias)) {
    return jsonError(
      "OPENROUTER_BYOK_ALIAS_MISSING",
      "Configure OPENROUTER_BYOK_ALIAS to match the OpenRouter BYOK key alias in Cloudflare AI Gateway.",
      503,
      headers
    );
  }

  const endpoint = new URL(
    `https://gateway.ai.cloudflare.com/v1/${encodeURIComponent(env.ACCOUNT_ID)}/${encodeURIComponent(env.GATEWAY_ID)}/openrouter/v1/chat/completions`
  );
  const requestHeaders = {
    "content-type": "application/json",
    "cf-aig-authorization": `Bearer ${gatewayToken}`,
    "cf-aig-byok-alias": alias
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: prompt }
        ]
      })
    });
  } catch (error) {
    const errorName = typeof error?.name === "string" &&
      /^[A-Za-z][A-Za-z0-9]{0,40}$/.test(error.name)
      ? error.name
      : "Error";
    console.error("OpenRouter gateway request failed", {
      provider,
      model,
      name: errorName
    });
    return jsonError(
      "OPENROUTER_UNREACHABLE",
      "Could not reach OpenRouter through Cloudflare AI Gateway.",
      502,
      headers
    );
  }

  let output;
  try {
    output = await response.json();
  } catch {
    output = null;
  }

  if (!response.ok) {
    const mappedError = openRouterError(response.status, output, headers);
    const rawRayId = response.headers.get("cf-ray");
    const rayId = rawRayId && /^[A-Za-z0-9-]{1,128}$/.test(rawRayId)
      ? rawRayId
      : undefined;
    console.error("OpenRouter gateway request failed", {
      provider,
      model,
      status: response.status,
      diagnosticCode: mappedError.code,
      ...getSafeUpstreamErrorMetadata(output, [
        env.CF_AIG_TOKEN
      ]),
      ...(rayId ? { cloudflareRayId: rayId } : {})
    });
    return mappedError.response;
  }

  const text = extractText(output);
  if (typeof text !== "string" || !text.trim()) {
    return jsonError(
      "AI_INVALID_PROVIDER_RESPONSE",
      "OpenRouter returned no text response.",
      502,
      headers
    );
  }
  return jsonResponse({ text, provider, model }, 200, headers);
}

const providerGatewayRoutes = {
  openai: { path: "openai/chat/completions", format: "openai" },
  anthropic: { path: "anthropic/v1/messages", format: "anthropic" },
  mistral: { path: "mistral/v1/chat/completions", format: "openai" },
  deepseek: { path: "deepseek/chat/completions", format: "openai" },
  cohere: { path: "cohere/v1/chat", format: "cohere" },
  xai: { path: "grok/v1/chat/completions", format: "openai" }
};

async function generateWithProviderGateway({
  env,
  model,
  prompt,
  instructions,
  provider,
  headers
}) {
  const gatewayToken = typeof env.CF_AIG_TOKEN === "string"
    ? env.CF_AIG_TOKEN.trim().replace(/^Bearer\s+/i, "")
    : "";
  if (!gatewayToken) {
    return jsonError(
      "AI_GATEWAY_TOKEN_MISSING",
      "The Cloudflare AI Gateway Run token is not configured on this Worker.",
      503,
      headers
    );
  }

  const route = providerGatewayRoutes[provider];
  if (!route) {
    return jsonError("UNSUPPORTED_PROVIDER", "Unsupported AI provider.", 400, headers);
  }
  const endpoint = new URL(
    `https://gateway.ai.cloudflare.com/v1/${encodeURIComponent(env.ACCOUNT_ID)}/${encodeURIComponent(env.GATEWAY_ID)}/${route.path}`
  );
  const requestHeaders = {
    "content-type": "application/json",
    "cf-aig-authorization": `Bearer ${gatewayToken}`
  };
  let body;
  if (route.format === "anthropic") {
    requestHeaders["anthropic-version"] = "2023-06-01";
    body = {
      model,
      max_tokens: 2048,
      system: instructions,
      messages: [{ role: "user", content: prompt }]
    };
  } else if (route.format === "cohere") {
    body = { model, preamble: instructions, message: prompt };
  } else {
    body = {
      model,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: prompt }
      ]
    };
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body)
    });
  } catch (error) {
    const errorName = typeof error?.name === "string" &&
      /^[A-Za-z][A-Za-z0-9]{0,40}$/.test(error.name)
      ? error.name
      : "Error";
    console.error("Cloudflare AI Gateway provider request failed", {
      provider,
      model,
      name: errorName
    });
    return jsonError(
      "AI_GATEWAY_UNREACHABLE",
      "Could not reach the selected provider through Cloudflare AI Gateway.",
      502,
      headers
    );
  }

  let output;
  try {
    output = await response.json();
  } catch {
    output = null;
  }
  if (!response.ok) {
    const rayId = response.headers.get("cf-ray");
    console.error("Cloudflare AI Gateway provider request failed", {
      provider,
      model,
      status: response.status,
      ...(rayId && /^[A-Za-z0-9-]{1,128}$/.test(rayId)
        ? { cloudflareRayId: rayId }
        : {})
    });
    const codes = upstreamErrors(output).map((error) => String(error.code));
    if (codes.includes("2044")) {
      return jsonError(
        "PROVIDER_CREDENTIALS_REQUIRED",
        "Cloudflare AI Gateway requires a valid provider key with the default alias.",
        502,
        headers
      );
    }
    if (response.status === 400 || response.status === 404) {
      return jsonError(
        "AI_GATEWAY_REQUEST_REJECTED",
        "Cloudflare AI Gateway rejected this provider or model request. Check model access and the default-alias BYOK configuration.",
        422,
        headers
      );
    }
    return jsonError(
      response.status === 401 || response.status === 403
        ? "AI_GATEWAY_AUTH_FAILED"
        : response.status === 429
          ? "AI_GATEWAY_RATE_LIMITED"
          : "AI_GATEWAY_PROVIDER_FAILED",
      response.status === 401 || response.status === 403
        ? "Cloudflare AI Gateway rejected its server-side Run token."
        : response.status === 429
          ? "Cloudflare AI Gateway or the selected provider rate limit was reached."
          : "The selected provider request through Cloudflare AI Gateway failed. Verify the model and stored provider key.",
      response.status === 429 ? 429 : 502,
      headers
    );
  }

  const text = route.format === "cohere"
    ? output?.text
    : extractText(output);
  if (typeof text !== "string" || !text.trim()) {
    return jsonError(
      "AI_INVALID_PROVIDER_RESPONSE",
      "The selected provider returned no text response.",
      502,
      headers
    );
  }
  return jsonResponse({ text, provider, model }, 200, headers);
}

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    const pathname = requestUrl.pathname;
    if (pathname !== "/") {
      return jsonError("NOT_FOUND", "Not found.", 404);
    }

    const origin = checkOrigin(request, env);
    if (!origin) {
      return jsonError("ORIGIN_NOT_ALLOWED", "Origin is not allowed.", 403);
    }
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return jsonError("METHOD_NOT_ALLOWED", "Method not allowed.", 405, headers);
    }
    const isLocalRequest = ["localhost", "127.0.0.1", "[::1]"]
      .includes(requestUrl.hostname);
    if (env.ALLOW_UNAUTHENTICATED_INFERENCE !== "true" || !isLocalRequest) {
      return jsonError(
        "PROJECT_AUTH_REQUIRED",
        "Project authentication is required for inference.",
        503,
        headers
      );
    }
    const contentType = request.headers.get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return jsonError(
        "INVALID_CONTENT_TYPE",
        "Content-Type must be application/json.",
        415,
        headers
      );
    }

    const parsed = await readBoundedJson(request);
    if (parsed.error) {
      return jsonError(parsed.code, parsed.error, parsed.status, headers);
    }
    const validationError = validatePayload(parsed.value, env);
    if (validationError) {
      const code = validationError.includes("model")
        ? "MODEL_NOT_ALLOWED"
        : "INVALID_REQUEST";
      return jsonError(code, validationError, 400, headers);
    }
    const { provider, model, prompt, instructions } = parsed.value;
    if (provider === "gemini") {
      return generateWithGoogleAIStudio({
        env,
        model,
        prompt,
        instructions,
        provider,
        headers
      });
    }
    if (provider === "openrouter") {
      return generateWithOpenRouter({
        env,
        model,
        prompt,
        instructions,
        provider,
        headers
      });
    }
    return generateWithProviderGateway({
      env,
      model,
      prompt,
      instructions,
      provider,
      headers
    });
  }
};
