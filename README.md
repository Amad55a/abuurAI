<p align="center">
  <img src="./assets/abuur-ai-logo.svg" alt="Abuur AI — Af-Soomaali JavaScript SDK" width="640">
</p>

# Abuur AI

Abuur AI is a Somali-first JavaScript SDK for asking questions and translating
text with seven AI providers through one consistent API. It supports Node.js
and browser builds. Requires Node.js 22 or later for backend use.

## Install

```sh
npm install abuur-ai
```

## First request

The public configuration uses Somali names: `bixiye` (provider),
`furahaAPI` (API key), `moodel` (model ID), and `tilmaamo` (instructions).

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-2.5-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
});

const jawaab = await ai.weydii("Salaan!");
console.log(jawaab.text);
```

## API keys and providers

Abuur AI does not load `.env` files. Set the key in your application or
deployment environment, or pass it as `furahaAPI`. Keep production keys on a
trusted server.

| Provider | `bixiye` | Server environment variable |
| --- | --- | --- |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` |
| Mistral | `mistral` | `MISTRAL_API_KEY` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| Cohere | `cohere` | `COHERE_API_KEY` |
| xAI | `xai` | `XAI_API_KEY` |

For each provider, configure an exact model ID supported by that provider and
your account. `gemini-2.5-flash` is the current default when no provider or
model is selected. Other model IDs shown in tests or examples are examples,
not claims of live availability. The SDK does not discover models or silently
switch providers.

All seven direct provider adapters have automated tests using mocked
responses. These tests check request/response handling, not live API access.
No provider/model combination is claimed as live-verified by this repository.

## Backend use

Pass keys via the server environment or `furahaAPI`. The environment variable
names above are provider-defined and stay unchanged:

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "openai",
  furahaAPI: process.env.OPENAI_API_KEY,
  moodel: "gpt-4.1-mini",
  tilmaamo: "Use clear, natural Somali unless asked otherwise."
});

const answer = await ai.weydii("Waa maxay barashada mashiinka?");
console.log(answer.text);
```

The model ID is caller-selected. The example model ID is not a live-test
claim; check the provider's current model documentation and your account.

## Browser use and key warning

Browser bundlers can use the browser entry directly:

```js
import { abuurAI } from "abuur-ai/browser";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: import.meta.env.VITE_GEMINI_API_KEY,
  moodel: "gemini-2.5-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
});

const answer = await ai.weydii("Salaan!");
```

**A key bundled into frontend code is visible to browser users.** The SDK
cannot hide or protect a frontend key. Use a restricted, limited-quota key only
if you accept this exposure; do not put production secrets in browser code.
For sensitive keys, call a trusted server endpoint that stores the key
server-side. The SDK's `gateway: "connected"` mode calls a route you provide;
it does not create, deploy, or authenticate that route for you.

The browser entry currently supports direct Gemini requests. It can also use
the Cloudflare Gateway transport when configured; the gateway route and its
authorization are the application's responsibility. Node and browser entry
points are separate and do not load each other's provider SDKs.

## Ask and translate

`weydii()` returns a provider response with a `.text` property:

```js
const answer = await ai.weydii("Sidee ayuu roobku u samaysmaa?");
console.log(answer.text);
```

`turjun()` takes the source text and requested target language:

```js
const translation = await ai.turjun("Good morning.", "Af-Soomaali");
console.log(translation.text);
```

The translation operation asks the model to return only the translation.
Model output may still be inaccurate; review important translations.

## Select a model and add instructions

Use `moodel` to provide an exact model ID. Use `tilmaamo` to set global
instructions applied to requests. Operation-specific requirements, such as
translation-only output, still apply.

In automatic mode, configure provider-specific keys and models:

```js
const ai = abuurAI({
  mode: "auto",
  providers: {
    gemini: {
      furahaAPI: process.env.GEMINI_API_KEY,
      moodel: "gemini-2.5-flash"
    },
    anthropic: {
      furahaAPI: process.env.ANTHROPIC_API_KEY,
      moodel: "your-supported-anthropic-model"
    }
  },
  tilmaamo: "Ku jawaab si cad."
});

const answer = await ai.weydii("Salaan!");
```

Automatic selection chooses a configured provider; it does not retry another
provider after a failure.

## Errors

Requests reject with an `Error` when configuration is invalid, a key is
missing, a provider rejects the request, or the network fails. Handle failures
at the application boundary:

```js
try {
  const answer = await ai.weydii("Salaan!");
  console.log(answer.text);
} catch (error) {
  console.error("Abuur AI request failed:", error.message);
}
```

Do not log API keys or sensitive prompts in error reporting.

## TypeScript

The package includes declarations:

```ts
import { abuurAI, type AbuurAIOptions } from "abuur-ai";

const options: AbuurAIOptions = {
  bixiye: "gemini",
  moodel: "gemini-2.5-flash",
  furahaAPI: process.env.GEMINI_API_KEY,
  tilmaamo: "Ku jawaab Af-Soomaali."
};

const ai = abuurAI(options);
const answer = await ai.weydii("Salaan!");
```

## Troubleshooting

- **Missing key:** confirm the provider's environment variable is set in the
  running server process, or pass `furahaAPI`.
- **Authentication or permission error:** check the key, account access, and
  provider billing/quota without printing the key.
- **Model not found:** verify the exact `moodel` ID and that your account may
  use it.
- **Browser request blocked:** check the browser's network/CORS policy and
  provider key restrictions. A same-origin trusted server route avoids
  exposing production keys.
- **Unsupported browser provider:** direct browser mode currently implements
  Gemini only. Use a caller-managed server route for other providers.

## Security

- Keep live API keys out of source control, frontend bundles, URLs, and logs.
- Use environment variables or your deployment platform's secret manager on
  the backend.
- Browser keys are public by design; restrict and rotate them if exposed.
- The package never loads `.env` automatically.

See [SECURITY.md](./SECURITY.md) for reporting and additional guidance.

## Development and tests

Install the repository dependencies, then run the mocked SDK tests:

```sh
npm ci
npm test
```

The suite includes Node, browser-entry, provider, and Cloudflare Worker
regressions. Live provider tests are not run by the normal test command and
require explicit credentials and authorization.

Additional guides: [Af-Soomaali](./README.so.md) ·
[Advanced configuration](./ADVANCED.md) ·
[Browser demo](./examples/browser/README.md) ·
[Cloudflare Worker example](./templates/cloudflare-ai-gateway/README.md)
