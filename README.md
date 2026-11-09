<p align="center">
  <a href="https://abuurai.axmada.me/">
    <img src="./assets/abuur-ai-logo.png" alt="Abuur AI — Build, Innovate, Empower" width="600">
  </a>
</p>

<h1 align="center">Abuur AI</h1>

<p align="center">
  A Somali-first JavaScript SDK that simplifies working with multiple AI providers through one consistent interface.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/abuur-ai"><img src="https://img.shields.io/npm/v/abuur-ai.svg?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/abuur-ai"><img src="https://img.shields.io/npm/l/abuur-ai.svg" alt="MIT license"></a>
  <a href="https://www.npmjs.com/package/abuur-ai"><img src="https://img.shields.io/node/v/abuur-ai.svg" alt="Node.js version"></a>
  <a href="https://abuurai.axmada.me/"><img src="https://img.shields.io/badge/docs-abuurai.axmada.me-8B5CF6" alt="Official documentation"></a>
</p>

<p align="center">
  <a href="https://abuurai.axmada.me/"><strong>Explore the official documentation →</strong></a>
</p>

## Introduction

Abuur AI is an open-source JavaScript SDK for building AI-powered applications, including Somali-language experiences. Use a single client API to send text-generation requests to multiple providers while keeping provider and model choices in your control.

Abuur AI standardizes common text workflows; it does not make providers identical. Model availability, pricing, limits, and capabilities depend on each provider. Somali-oriented prompt guidance is not a guarantee of translation quality or factual accuracy.

## Key features

- **One interface, multiple providers:** configure a provider and model without learning a new SDK for every integration.
- **Somali-first API:** Somali-named configuration and task methods, such as `bixiye`, `weydii()`, and `turjun()`.
- **Useful text workflows:** generation, translation, summarization, writing, conversations, and code assistance.
- **Streaming:** consume response chunks with an async iterator where the selected adapter supports it.
- **Node.js and browser entry points:** Node.js supports all twelve bundled providers; browser support is available for six.
- **TypeScript declarations:** public client, request, provider, and response types ship with the package.

## Supported AI providers

| Provider | Node.js | Browser |
| --- | :---: | :---: |
| Gemini | ✓ | ✓ |
| OpenAI | ✓ | — |
| Anthropic | ✓ | — |
| Mistral | ✓ | — |
| DeepSeek | ✓ | — |
| Cohere | ✓ | — |
| xAI | ✓ | — |
| OpenRouter | ✓ | ✓ |
| Ollama | ✓ | ✓ |
| Perplexity | ✓ | ✓ |
| Meta | ✓ | ✓ |
| NVIDIA | ✓ | ✓ |

Browser Gemini supports text generation but not streaming. Provider and model capabilities differ. Browser requests expose their API keys, so keep private production credentials on a trusted backend.

## Installation

Abuur AI is an ES module and requires **Node.js 22 or newer** for server use.

```sh
npm install abuur-ai
```

Set the API key for your chosen provider in the server or deployment environment. Abuur AI does not load `.env` files; configure dotenv in your application if needed. Never commit or expose a private API key in frontend code.

## Quick start

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-3.8-flash"
});

const jawaab = await ai.weydii("Salaan!");
console.log(jawaab.text);
```

The model ID is an example; confirm current availability with your provider. See the [installation guide](https://abuurai.axmada.me/en/installation) for key safety and browser setup.

## Build a Somali-language AI assistant

This small Node.js example uses the documented `abuurAI()` factory and `weydii()` method. Set `GEMINI_API_KEY` in your environment before running it:

```js
import { abuurAI } from "abuur-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Set GEMINI_API_KEY before starting the assistant.");
}

const assistant = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-3.8-flash",
  tilmaamo: "Ku jawaab Af-Soomaali. Si cad oo kooban u sharax."
});

async function askAssistant(question) {
  const jawaab = await assistant.weydii(question);
  return jawaab.text;
}

const jawaab = await askAssistant("Sidee ayay tamarta qorraxdu u shaqaysaa?");
console.log(jawaab);
```

This is a text-generation example, not native tool calling or an autonomous agent. The model generates the reply; the application decides how to use it.

## Full documentation

Explore the [official Abuur AI documentation](https://abuurai.axmada.me/) for installation guides, provider configuration, API references, and examples.

- [English documentation](https://abuurai.axmada.me/en)
- [Dukumentiyada Af-Soomaaliga](https://abuurai.axmada.me/so)
- [API reference](https://abuurai.axmada.me/en/api-reference)
- [GitHub repository](https://github.com/Amad55a/abuurAI)
- [npm package](https://www.npmjs.com/package/abuur-ai)

## Contributing

Contributions are welcome. Read the [contribution guide](./CONTRIBUTING.md) for development setup, tests, and project conventions. Please do not include API keys, secrets, or private user data in issues, pull requests, or tests.

## License

Abuur AI is released under the [MIT License](./LICENSE).
