# Browser demo

This example demonstrates using Abuur AI's browser entry directly in the browser.

## Important security warning

**API keys included in browser code or frontend bundles are visible to anyone inspecting network requests or page source.**
- Use only a restricted, rate-limited test key for browser testing.
- Never use a production API key with sensitive permissions or billing accounts in client-side code.
- For production applications, send requests to your own secure backend server instead.

## How to run

1. Copy `config.example.js` to `config.js`:
   ```sh
   cp config.example.js config.js
   ```
2. In `config.js`, set your test `furahaAPI` (Gemini API key).
3. From the repository root, start any static development web server (e.g., `npx serve .`).
4. Open `examples/browser/` in your browser.
