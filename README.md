<p align="center">
  <img src="./assets/abuur-ai-logo.svg" alt="Abuur AI — Af-Soomaali JavaScript SDK" width="640">
</p>

# Abuur AI

Abuur AI is a simple, Somali-first JavaScript SDK that connects your applications to popular AI services. With Abuur AI, you can easily ask questions and translate text across multiple AI providers using clean, beginner-friendly Somali names.

## What Abuur AI does

- **Ask questions:** Send prompts and get text responses using `weydii()`.
- **Translate text:** Translate content between languages naturally using `turjun()`.
- **Work with multiple AI models:** Use one consistent method to talk to 7 major AI providers.
- **Run anywhere:** Works in both Node.js (version 22+) and modern web browsers.

## Who can use it

Abuur AI is designed for:
- Developers building Somali-language applications, chatbots, or websites.
- Beginners who want an easy, intuitive way to interact with AI models.
- Teams looking for a unified JavaScript library to switch between AI providers without rewriting their code.

## Installation

Install Abuur AI using npm:

```sh
npm install abuur-ai
```

## Quick start

Here is a quick example of how to import, configure, and use `abuurAI()`:

```js
import { abuurAI } from "abuur-ai";

// 1. Configure Abuur AI
const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-2.5-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
});

// 2. Ask a question
const response = await ai.weydii("Salaan! Sidee tahay?");
console.log(response.text);
```

### Somali configuration terms

Abuur AI uses clear Somali terms for its configuration:
- `bixiye`: The AI provider you want to use (e.g., `"gemini"`, `"openai"`).
- `furahaAPI`: Your secret API key.
- `moodel`: The model name (e.g., `"gemini-2.5-flash"`, `"gpt-4o-mini"`).
- `tilmaamo`: System instructions or guidance for how the model should behave.

## Supported providers

Abuur AI directly supports 7 leading AI providers:

| Provider | `bixiye` value | Server environment variable |
| --- | --- | --- |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` |
| Mistral | `mistral` | `MISTRAL_API_KEY` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| Cohere | `cohere` | `COHERE_API_KEY` |
| xAI | `xai` | `XAI_API_KEY` |

If you do not specify a provider or model, Gemini with `gemini-2.5-flash` is used by default.

## Sending prompts with `weydii()`

The `weydii()` function sends your prompt to the AI and returns an object with a `.text` property:

```js
const response = await ai.weydii("Waa maxay caqliga macmalka ah (AI)?");
console.log(response.text);
```

You can also pass specific options for a single request:

```js
const response = await ai.weydii("Explain photosynthesis in simple terms.", {
  bixiye: "openai",
  moodel: "gpt-4o-mini",
  tilmaamo: "Explain in Somali suitable for a high school student."
});
console.log(response.text);
```

## Translating with `turjun()`

The `turjun()` function translates text into your chosen target language:

```js
const translation = await ai.turjun("Good morning, how are you today?", "Somali");
console.log(translation.text);
```

You can also translate from Somali into other languages:

```js
const translation = await ai.turjun("Subax wanaagsan, maanta sidee tahay?", "English");
console.log(translation.text);
```

## Choosing a provider and model

You can set your default provider and model when initializing `abuurAI()`, or configure multiple providers in automatic mode:

```js
const ai = abuurAI({
  mode: "auto",
  providers: {
    gemini: {
      furahaAPI: process.env.GEMINI_API_KEY,
      moodel: "gemini-2.5-flash"
    },
    openai: {
      furahaAPI: process.env.OPENAI_API_KEY,
      moodel: "gpt-4o-mini"
    }
  },
  tilmaamo: "Ku jawaab Af-Soomaali cad oo kooban."
});
```

You can choose or inspect which model will be selected before making a call:

```js
const chosen = ai.doorModel({ bixiye: "openai" });
console.log("Selected provider:", chosen.provider);
console.log("Selected model:", chosen.model);
```

## Node.js and browser usage

### In Node.js (server-side)

In Node.js, install `abuur-ai` and set your API keys in your environment variables:

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY
});

const result = await ai.weydii("Sidee u shaqeeyaa kumbuyuutarku?");
console.log(result.text);
```

### In the browser (client-side)

For browser applications (like Vite, Webpack, or direct ES module scripts), import from `abuur-ai/browser`:

```js
import { abuurAI } from "abuur-ai/browser";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: "YOUR_BROWSER_TEST_KEY"
});

const result = await ai.weydii("Salaan dunida!");
console.log(result.text);
```

## Protecting your API keys

> [!WARNING]
> **API keys bundled into frontend or browser code are publicly visible.**
> Anyone who visits your website can inspect network traffic or view page source code to copy your API key.

To keep your keys safe:
- **Never put private production keys in client-side browser code.**
- **Use server-side code (Node.js) for production apps:** Keep your real API keys on your backend server and let your frontend talk to your own server endpoint.
- **Do not commit `.env` files or API keys to GitHub.**
- If you use a key in the browser for testing or demos, use a restricted key with low spend limits, and rotate it regularly.

## Error handling

Always wrap your AI requests in a `try...catch` block so your application can handle network or provider errors gracefully:

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY
});

try {
  const result = await ai.weydii("Maxaa cusub maanta?");
  console.log(result.text);
} catch (error) {
  // Handle the error cleanly
  console.error("Codsiga wuu fashilmay:", error.message);
}
```

Common reasons for errors:
- **Missing or invalid API key:** Make sure your key is correct and properly loaded into the environment variable.
- **Quota or credit limit reached:** Check your account status and billing with the provider.
- **Network failure:** Ensure your machine or server has an active internet connection.

## License

MIT © [Ahmed Abdullahi Shir](https://github.com/Amad55a)
