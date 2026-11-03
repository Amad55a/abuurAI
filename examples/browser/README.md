# Browser demo

This example uses Abuur AI's browser entry and a caller-managed Cloudflare AI
Gateway endpoint. The browser sends requests to that endpoint; the Worker
stores and uses any gateway credentials. Do not put a provider key, gateway
token, or other secret in `config.js` or browser code.

Copy `config.example.js` to `config.js`, then set the public endpoint,
Cloudflare account ID, gateway ID, and an allowed model. These identifiers are
not credentials, but the endpoint must enforce the access and origin policy
appropriate for your application.

From the repository root, serve the repository with a static development
server that supports ES modules, then open `examples/browser/`. The demo
imports the SDK source directly; it is not part of the published npm package.

The demo requires a compatible Gateway Worker that supports Gemini and
OpenRouter. See [the Gateway template](../../templates/cloudflare-ai-gateway/README.md)
for its configuration and security requirements.
