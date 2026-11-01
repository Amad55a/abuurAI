
export function handleError(error, provider = "unknown", secret) {
  const status = error?.status || error?.code;

  if (
    Number(status) === 401 ||
    status === "invalid_api_key" ||
    status === "authentication_error"
  ) {
    throw new Error(
      `${provider}: Invalid API key. Please check your API key.`
    );
  }

  if (
    Number(status) === 429 ||
    status === "insufficient_quota" ||
    status === "rate_limit_error"
  ) {
    throw new Error(
      `${provider}: API limit or credits exceeded. Check your billing or usage limits.`
    );
  }

  if (
    ["ENOTFOUND", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"].includes(error?.code) ||
    error?.name === "TypeError" &&
      /fetch failed|network|socket|connection/i.test(error?.message || "")
  ) {
    throw new Error(
      `${provider}: Network connection failed. Please try again.`
    );
  }

  const message = error?.message || "An unexpected error occurred.";
  const safeMessage =
    typeof secret === "string" && secret
      ? String(message).split(secret).join("[REDACTED]")
      : message;

  throw new Error(`${provider}: ${safeMessage}`);
}
