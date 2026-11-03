# Abuur AI Cloudflare AI Gateway Worker example

This Worker is an optional server-side route for the local browser demo:

```text
Browser -> local Worker -> Cloudflare AI Gateway -> configured provider
```

Provider keys are configured in Cloudflare AI Gateway BYOK. The Worker
supports provider-native text requests for Gemini, OpenAI, Anthropic, Mistral,
DeepSeek, Cohere, xAI, and OpenRouter. Its model allowlist is configured in
`wrangler.toml`; IDs there are examples and are not a claim of live model
availability.

## Local development

The Worker project uses Wrangler 4:

```powershell
npm install
npm run dev
```

Configure local credentials in an ignored `.dev.vars` file as described by
Wrangler. Never commit or print its contents. Do not put provider keys,
Cloudflare tokens, or real credentials in browser files.

This Worker is designed for local development and rejects deployed inference.
It does not implement public-user authentication, rate limiting, or a
production authorization layer. Do not deploy it publicly as-is. CORS is not
authentication.

## Browser and credential boundary

The browser sends the prompt, selected provider, and model to the Worker. It
does not send provider API keys. The Worker uses the configured Gateway and
BYOK aliases to reach the provider. Keep any account-scoped Gateway Run token
server-side.

The Abuur AI SDK can call a caller-provided trusted route using
`gateway: "connected"` (Gemini only) or the explicit Cloudflare gateway
transport. It does not create or secure the Worker for you.

## Provider routes

Provider endpoint paths are implementation details and may change with
Cloudflare's service. Consult current Cloudflare AI Gateway documentation
before modifying this example. The local automated Worker tests mock
upstream responses; they do not prove live Cloudflare or provider access.

Run the repository's SDK and Worker regressions from the root:

```powershell
npm.cmd test
```
