<p align="center">
  <img src="./assets/abuur-ai-logo.svg" alt="Abuur AI — Somali-first JavaScript SDK" width="640">
</p>

# Abuur AI

Abuur AI is a Somali-first JavaScript SDK for sending text-generation requests
to twelve AI providers through one consistent API. It gives applications
Somali-named configuration and task methods while keeping provider, model,
request, and response details available to JavaScript and TypeScript
developers.

Use it to build Somali-language assistants, translation and writing tools,
chat experiences, and applications that need to switch AI providers without
rewriting every operation. It runs in Node.js 22+ and has a browser entry for
Gemini, OpenRouter, Ollama, Perplexity, Meta, and NVIDIA. The Node entry also
supports OpenAI, Anthropic, Mistral, DeepSeek, Cohere, and xAI.

Abuur AI standardizes text requests; it does not make providers identical.
Each provider controls model availability, billing, rate limits, output
quality, and supported capabilities. The bundled providers implement text
generation and streaming, not every advanced multimodal, embedding, or
tool-calling feature exposed by this client. Such features require a compatible
custom adapter. Somali-oriented prompts are guidance, not a guarantee of
translation quality or factual accuracy.

## Table of contents

- [Installation and first request](#installation-and-first-request)
- [Environment variables and key safety](#environment-variables-and-key-safety)
- [Configuration reference](#configuration-reference)
- [Supported Providers and Models](#supported-providers-and-models)
- [Provider setup examples](#provider-setup-examples)
- [Text operations and examples](#text-operations-and-examples)
- [Conversations, streaming, and cancellation](#conversations-streaming-and-cancellation)
- [Choosing providers and models](#choosing-providers-and-models)
- [Structured output, knowledge, and custom adapters](#structured-output-knowledge-and-custom-adapters)
- [Usage and token tracking](#usage-and-token-tracking)
- [API reference](#api-reference)
- [Browser and Node.js](#browser-and-nodejs)
- [Errors and troubleshooting](#errors-and-troubleshooting)
- [TypeScript](#typescript)
- [FAQ](#faq)
- [Contributing, support, and license](#contributing-support-and-license)

## Installation and first request

```sh
npm install abuur-ai
```

The package is an ES module and requires Node.js 22 or newer for server use.
The only public factory is `abuurAI()`:

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-3.8-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
});

const jawaab = await ai.weydii("Salaan!");
console.log(jawaab.text);
```

`weydii()` returns a promise for an `AIResponse` containing `text`, `provider`,
`model`, and (when reported by the provider) `usage`. The configured provider
and model are used unless a request overrides the provider. The SDK does not
silently retry a failed request against a different provider.

## Environment variables and key safety

Set the provider key in the server or deployment environment. Abuur AI does
not load `.env` files itself. In a local Node project, the optional `dotenv`
package can load one explicitly:

```sh
npm install dotenv
```

```js
import "dotenv/config";
import { abuurAI } from "abuur-ai";
```

Use the variable for the provider you selected (listed in the provider table).
You can instead pass the secret as `furahaAPI`; for several providers, use
`providers.<id>.furahaAPI`. Never commit a real key or put a private production
key in browser code, a public frontend bundle, a URL, or logs. Browser requests
expose their key to every user. Keep private keys on a trusted backend and
proxy requests through your own authenticated service. Revoke a key if it is
exposed.

## Configuration reference

All option names below are accepted by `abuurAI(options)`. Somali names are the
recommended API. English compatibility aliases are deprecated.

| Option | Type | Default | Required? | Meaning |
| --- | --- | --- | --- | --- |
| `bixiye` | `ProviderId` | `"gemini"` when a request needs a provider; otherwise `null` in config | No | Default provider ID. |
| `furahaAPI` | `string` | `null` | For all hosted providers; not for local Ollama | API key for the top-level selected provider. |
| `moodel` | `string` | `null`; Gemini selection defaults to `gemini-2.5-flash` in the current implementation | Required by providers except Gemini's selector default | Exact provider model ID. Confirm it remains available; Google currently marks the default as deprecated/limited. |
| `tilmaamo` | `string` | `null` | No | Global instruction prepended to supported text requests. Task-specific mandatory prompts take precedence. |
| `cinwaankaAPI` | `string` | Provider default | No | Custom endpoint, honored by OpenRouter, Ollama, Perplexity, Meta, and NVIDIA. Other adapters use fixed/provider-SDK endpoints. |
| `providers` | `Partial<Record<ProviderId, ProviderConfig>>` | `{}` | No | Per-provider `furahaAPI`, `moodel`, endpoint, `fetch`, and declared capabilities. Useful in `mode: "auto"`. |
| `mode` | `"manual" \| "auto"` | `"manual"` | No | `auto` allows `doorModel()` to choose among configured providers. It does not provide inference failover. |
| `language` | `string` | `"automatic"` | No | Default language hint; `"automatic"` asks the model to respond in the input language (Somali guidance is included). |
| `providerPreference` | `ProviderId[]` | `[]` | No | Global ordering preference for automatic model selection. |
| `taskProviderPreferences` | `Partial<Record<ProviderTask, ProviderId[]>>` | `{}` | No | Per-task order for `translation`, `summarization`, `writing`, `coding`, `reasoning`, `classification`, or `conversation`. |
| `pricing` | `Record<string, ModelPricing \| Record<string, ModelPricing>>` | `{}` | No | Optional custom rates for estimated costs; see [usage tracking](#usage-and-token-tracking). |
| `fetch` | `typeof fetch` | `globalThis.fetch` or provider SDK default | No | Custom Fetch implementation, useful for tests, proxies, or supported network environments. |

`ModelPricing` has `inputPerMillion` and `outputPerMillion` numeric rates. A
provider-specific entry can be `{ inputPerMillion, outputPerMillion }`, or a
map by model ID. For provider-specific setup, `ProviderConfig` also accepts
`capabilities: ProviderCapability[]`; this can restrict declared custom-adapter
capabilities, but cannot create capabilities an adapter does not implement.

Deprecated aliases are `provider`, `apiKey`, `model`, `instructions`, and
`systemPrompt`; `endpoint` is the compatibility alias for `cinwaankaAPI`.
Conflicting Somali and English values are rejected. Provider-specific options
also accept deprecated `apiKey`, `model`, and `endpoint`.

The top-level key/model apply only to the selected provider. They are never
reused as credentials for a different provider. Use the `providers` map to
configure more than one provider. Options are validated at initialization and
when the affected operation is called; provider-side model access is not
pre-validated.

## Supported Providers and Models

The package supports the twelve provider IDs below. Model IDs are examples
verified against official catalogues on **3 November 2026**; they are not
bundled with the SDK and the list is not exhaustive. Provider catalogues,
aliases, preview status, account entitlements, and endpoints can change.
Check the linked catalogue and your account before deployment. An adapter
accepting a model string does not guarantee that the provider currently offers
it, your account can access it, or it supports every feature in this SDK.

| Provider / `bixiye` | Endpoint used by this adapter | Key and default | Verified example model IDs and official catalogue |
| --- | --- | --- | --- |
| Google Gemini / `gemini` | Google GenAI SDK; browser uses `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | `GEMINI_API_KEY`; selector default `gemini-2.5-flash` (deprecated/limited for new users) | `gemini-3.8-flash`, `gemini-4-argon`; [Google model catalogue](https://ai.google.dev/gemini-api/docs/models) |
| OpenAI / `openai` | OpenAI SDK Responses API | `OPENAI_API_KEY`; no SDK model default | `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6-luna`; [OpenAI model catalogue](https://developers.openai.com/api/docs/models) |
| Anthropic / `anthropic` | `https://api.anthropic.com/v1/messages` | `ANTHROPIC_API_KEY`; no default | `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`; [Anthropic model overview](https://platform.claude.com/docs/en/models/overview) |
| Mistral / `mistral` | `https://api.mistral.ai/v1/chat/completions` | `MISTRAL_API_KEY`; no default | `mistral-large-4`, `mistral-small-4`; [Mistral models](https://docs.mistral.ai/models/) |
| DeepSeek / `deepseek` | `https://api.deepseek.com/chat/completions` | `DEEPSEEK_API_KEY`; no default | `deepseek-flash`, `deepseek-v4-pro`; [DeepSeek models and pricing](https://api-docs.deepseek.com/quick_start/pricing) |
| Cohere / `cohere` | `https://api.cohere.com/v2/chat` | `COHERE_API_KEY`; no default | `command-a-plus-05-2026`, `command-a-03-2025`, `command-a-reasoning-08-2025`; [Cohere models](https://docs.cohere.com/v2/docs/models) |
| xAI / `xai` | `https://api.x.ai/v1/chat/completions` | `XAI_API_KEY`; no default | `grok-4.7`, `grok-4.6`, `grok-4.5`; [xAI models](https://docs.x.ai/developers/models) |
| OpenRouter / `openrouter` | `https://openrouter.ai/api/v1/chat/completions` | `OPENROUTER_API_KEY`; no default | `openai/gpt-4o` (format: `provider/model`); [OpenRouter model catalogue](https://openrouter.ai/models) |
| Ollama / `ollama` | Local default `http://localhost:11434/v1/chat/completions`; configurable | No key for local Ollama. `OLLAMA_API_KEY` is optional (cloud); no model default | `llama3.2`, `llama3.2:1b`, `gemma4:31b`; [Ollama library](https://ollama.com/library) |
| Perplexity / `perplexity` | `https://api.perplexity.ai/chat/completions` | `PERPLEXITY_API_KEY`; no default | `sonar` (legacy Sonar Chat Completions ID); [Perplexity migration/model docs](https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview) |
| Meta Model API / `meta` | `https://api.meta.ai/v1/chat/completions` (OpenAI-compatible Chat Completions) | `META_API_KEY`; no default | `muse-spark-1.3`, `muse-wonder-1.0`; [Meta Model API models](https://dev.meta.ai/docs/models) |
| NVIDIA NIM / `nvidia` | `https://integrate.api.nvidia.com/v1/chat/completions` | `NVIDIA_API_KEY`; no default | `deepseek-ai/deepseek-v4-pro`, `meta/llama-3.3-70b-instruct`, `mistralai/mixtral-8x7b-instruct`; [NVIDIA NIM LLM catalogue](https://docs.api.nvidia.com/nim/reference/llm-apis) |

All providers except local Ollama require a non-empty API key. The regular
Node providers and the browser-supported OpenAI-compatible HTTP providers
implement generation and SSE streaming. The Gemini browser adapter implements
generation only; streaming is not available through that browser adapter.
The Node adapters for OpenAI, Anthropic, Mistral, DeepSeek, Cohere, and xAI are
not included in the browser entry.

Model catalogues:

- **Gemini:** Use a current API model ID such as `gemini-3.8-flash`. The
  implementation's `gemini-2.5-flash` fallback is deprecated and limited to
  existing users; change `moodel` for new projects.
- **OpenAI:** The adapter uses the Responses API. Use a model listed for
  Responses, for example `gpt-6.1-sol`.
- **Anthropic:** Use an API ID from the Claude API overview, not a marketing
  name. The adapter sends Messages API requests with a fixed `max_tokens: 1024`.
- **Mistral:** Model IDs are account/catalogue-specific; the adapter expects
  the Mistral chat-completions API format.
- **DeepSeek:** Use IDs from DeepSeek's current model and pricing page. The
  SDK sends the regular chat-completions request, not separate reasoning-mode
  parameters.
- **Cohere:** The adapter uses Cohere v2 Chat. It does not implement Cohere's
  separate Rerank, Embed, Parse, or transcription APIs.
- **xAI:** Use a text/chat model ID from xAI's catalogue.
- **OpenRouter:** IDs are catalogue slugs, usually `provider/model`, not just
  the underlying model name. Browse [openrouter.ai/models](https://openrouter.ai/models)
  or list IDs with OpenRouter's `GET /api/v1/models`; check that a selected
  model supports Chat Completions.
- **Ollama:** Install Ollama, pull a model, and start its service. For example:

  ```sh
  ollama pull llama3.2
  ollama serve
  ```

  Set `bixiye: "ollama"` and `moodel: "llama3.2"`. The endpoint defaults to
  `http://localhost:11434/v1`; Ollama's OpenAI-compatible endpoint is used.
  Override it with `cinwaankaAPI`, `OLLAMA_ENDPOINT`, or `OLLAMA_HOST`. Local
  auth is not required. Current Ollama cloud usage can use `OLLAMA_API_KEY`
  and `cinwaankaAPI: "https://ollama.com/v1"`; cloud model availability and
  access are controlled by Ollama.
- **Perplexity:** This adapter currently sends legacy Sonar Chat Completions
  requests. Perplexity announced the end of Sonar Chat Completions support on
  27 September 2026 and recommends its newer Agent API. This SDK version does
  not implement that Agent API; synchronous and streaming legacy requests may
  be reformulated during the provider's migration. Treat this integration as
  transitional and verify it before relying on it.
- **Meta:** This is the official Meta Model API at `api.meta.ai`, using an API
  key from the Meta Model API dashboard and the OpenAI-compatible
  `/v1/chat/completions` endpoint. Examples such as `muse-spark-1.3` and
  `muse-wonder-1.0` are Meta Model API IDs. It is not a request to Meta's
  consumer Meta AI chat product, and is distinct from running Llama locally
  with Ollama or accessing third-party hosted Llama through OpenRouter.
- **NVIDIA:** This is NVIDIA-hosted NIM inference, not the NVIDIA SDK or local
  CUDA inference. Use the exact model slug in the NIM catalogue; self-hosted
  NIM instances can be targeted with `cinwaankaAPI` if they implement the
  same chat-completions schema.

## Provider setup examples

### Choose another hosted provider

Each adapter needs its provider's own model ID and key:

```js
const ai = abuurAI({
  bixiye: "openai",
  furahaAPI: process.env.OPENAI_API_KEY,
  moodel: "gpt-6.1-sol"
});
console.log((await ai.weydii("Explain photosynthesis.")).text);
```

### Configure an OpenRouter catalogue model

Pass the full slug from OpenRouter's catalogue:

```js
const ai = abuurAI({
  bixiye: "openrouter",
  furahaAPI: process.env.OPENROUTER_API_KEY,
  moodel: "openai/gpt-4o"
});
```

### Use a custom endpoint

`cinwaankaAPI` is supported by OpenRouter, Ollama, Perplexity, Meta, and
NVIDIA. Set a compatible endpoint path (including `/chat/completions` when
required):

```js
const ai = abuurAI({
  bixiye: "openrouter",
  furahaAPI: process.env.OPENROUTER_API_KEY,
  moodel: "openai/gpt-4o",
  cinwaankaAPI: "https://openrouter.ai/api/v1/chat/completions"
});
```

### Use local or cloud Ollama

Start Ollama locally and pull a model using the commands above:

```js
const local = abuurAI({ bixiye: "ollama", moodel: "llama3.2" });
console.log((await local.weydii("Ku jawaab Af-Soomaali: Salaan.")).text);
```

For Ollama's hosted cloud API, configure its cloud key and endpoint explicitly:

```js
const cloud = abuurAI({
  bixiye: "ollama",
  furahaAPI: process.env.OLLAMA_API_KEY,
  moodel: "gemma4:31b-cloud",
  cinwaankaAPI: "https://ollama.com/v1"
});
```

## Text operations and examples

All text operations return a promise for the provider's `AIResponse`. The
default provider/model comes from `abuurAI()`; optional final `options`
supports `bixiye`, `moodel` (for selection/reporting), `tilmaamo`, and
`language`. Text generation is performed by the provider-selected model.

```js
const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-3.8-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
});

console.log((await ai.weydii("Waa maxay AI?")).text);
console.log((await ai.turjun("Good morning!", "Somali")).text);
console.log((await ai.sooKoob("A long article to summarize...")).text);
console.log((await ai.sharax("Explain the water cycle.")).text);
console.log((await ai.sax("Somalia are a beautiful country.")).text);
console.log((await ai.dibUqor("Rewrite this more clearly.")).text);
console.log((await ai.hagaaji("Improve this paragraph.")).text);
console.log((await ai.balaadhi("Expand this short idea.")).text);
console.log((await ai.qor("Write a polite appointment email.")).text);
console.log((await ai.curi("Create an original short story about a camel.")).text);
console.log((await ai.fikrado("Low-cost community projects")).text);
console.log((await ai.cinwaan("An article about Somali poetry")).text);
console.log((await ai.sameeSuaalo("A lesson about solar energy")).text);
console.log((await ai.falanqee("Review this argument: ...")).text);
console.log((await ai.kalaSaar("The delivery arrived late.", ["positive", "negative", "neutral"])).text);
console.log((await ai.dareen("I am delighted with the result.")).text);
console.log((await ai.sooSaarXog("Extract the date and location: ...")).text);
console.log((await ai.isbarbarDhig(["Option A details", "Option B details"])).text);
console.log((await ai.qorCode("Write a JavaScript function that adds two numbers.")).text);
console.log((await ai.sharaxCode("const total = prices.reduce((a, b) => a + b, 0);")).text);
console.log((await ai.saxCode("const x = ;")).text);
console.log((await ai.dibUhabeeCode("function f(x){return x+1}")).text);
```

Examples with provider/model/instruction overrides:

```js
const somali = await ai.weydii("What is photosynthesis?", {
  bixiye: "openrouter",
  moodel: "openai/gpt-4o",
  tilmaamo: "Explain simply in Somali."
});
const englishTranslation = await ai.turjun("Subax wanaagsan.", "English", {
  language: "English"
});
```

`moodel` on per-call options is part of the public request type but is not
used to reconfigure a provider adapter after initialization. Configure the
selected model in top-level `moodel` or `providers.<id>.moodel`.

## Conversations, streaming, and cancellation

Conversation state is kept in memory per provider for the lifetime of the
client. `wadaSheekeysi()` starts a history and `siiWad()` requires a prior
message; `nadiifi()` clears one provider's history or all histories.

```js
const first = await ai.wadaSheekeysi("Aan ka hadalno beeraha.");
const next = await ai.siiWad("Maxay waraabintu muhiim u tahay?");
ai.nadiifi(); // clear all providers' conversations
```

Streaming yields `AIStreamChunk` objects, typically with a `text` delta and
sometimes a final `usage` chunk:

```js
for await (const chunk of ai.qulqul({ prompt: "Sheeg sheeko gaaban." })) {
  if (chunk.text) process.stdout.write(chunk.text);
}
```

Cancel supported single requests with the standard `AbortSignal`:

```js
const controller = new AbortController();
const pending = ai.weydii("Write a long answer.", { signal: controller.signal });
setTimeout(() => controller.abort(), 100);
try {
  await pending;
} catch (error) {
  if (error.name === "AbortError") console.log("Request cancelled.");
  else throw error;
}
```

`qulqul({ prompt, signal })` also accepts an abort signal. Cancellation support
depends on the underlying provider transport; this SDK does not promise that
the provider will stop billing immediately. The general text operation
wrappers and conversation methods do not forward `signal`.

Streaming is SSE-based for the HTTP adapters and provider SDK streams for
OpenAI/Gemini. The browser Gemini adapter does not implement streaming.
Provider buffering, model support, and final token-usage events vary; not every
stream includes usage.

## Choosing providers and models

For multiple configured providers, use `mode: "auto"`. Every configured hosted
provider needs its own API key and model. Local Ollama requires a model but
not a key.

```js
const ai = abuurAI({
  mode: "auto",
  providers: {
    gemini: { furahaAPI: process.env.GEMINI_API_KEY, moodel: "gemini-3.8-flash" },
    openai: { furahaAPI: process.env.OPENAI_API_KEY, moodel: "gpt-6.1-sol" }
  },
  providerPreference: ["gemini", "openai"],
  taskProviderPreferences: { coding: ["openai", "gemini"] }
});

const selection = ai.doorModel({ task: "coding" });
console.log(selection.provider, selection.model);
const answer = await ai.weydii("Write a small parser.", { bixiye: selection.provider });
```

Supported tasks: `translation`, `summarization`, `writing`, `coding`,
`reasoning`, `classification`, and `conversation`. `doorModel()` also accepts
`task`, `preferredProvider`, `allowedProviders`, `allowedModels`,
`capability`, and `requiredCapabilities`. It returns selection metadata; it
does not make a request. `awoodahaModelka()` reports adapter-level support,
not live model entitlements.

In manual mode the default is Gemini. Per-request `bixiye` can switch to
another already configured adapter. In automatic mode an explicit provider
must be configured. Neither mode silently fails over after a request error.

## Structured output, knowledge, and custom adapters

The built-in provider adapters currently expose only text generation and
streaming (Cohere and Claude may have provider-side extra features, but this
adapter does not implement them). Structured JSON, embeddings, media methods,
dialect detection, and agent tool calling need a custom adapter registered
through `ai.providers.register()`. Unsupported capabilities reject explicitly.

### Structured JSON with a custom adapter

```js
const structured = abuurAI({ bixiye: "custom" });
structured.providers.register("custom", {
  capabilities: ["structured-output"],
  generateStructured: async () => ({ data: { name: "Ayaan", age: 20 } })
});
const extracted = await structured.sooSaarJSON({
  prompt: "Return a name and age.",
  schema: {
    type: "object",
    properties: { name: { type: "string" }, age: { type: "integer" } },
    required: ["name", "age"],
    additionalProperties: false
  }
});
console.log(extracted.data);
```

The SDK parses string JSON and validates the result against its supported JSON
Schema subset. A provider adapter must implement `generateStructured`.

### Knowledge retrieval

Lexical retrieval uses local token matching, then sends matching text to the
configured model. Do not send sensitive documents unless permitted:

```js
const knowledge = await ai.raadsoAqoon({
  question: "What does this note say about water?",
  documents: [
    { id: "field-notes", content: "Clean water supports healthy communities." }
  ],
  limit: 4
});
console.log(knowledge.answer, knowledge.sources);
```

Default strategy is `lexical`, with 1200-character chunks, 160-character
overlap, and at most four results. `semantic` requires a custom embedding
adapter and explicit `embeddingModel`; an optional `vectorStore` must implement
`search(vector, options)`, and `upsert(records, options)` when
`indexDocuments: true`.

### Registered tools and agents

`wakiilAI()` requires a custom adapter with `generateWithTools` and declared
`tool-calling` capability. Tools are explicitly supplied, schema-validated,
and locally executed. Approval can be required for side effects:

```js
const agent = abuurAI({ bixiye: "custom" });
agent.providers.register("custom", {
  capabilities: ["tool-calling"],
  generateWithTools: async ({ step }) => step === 1
    ? { toolCall: { name: "lookup", arguments: { topic: "Somalia" } } }
    : { finalAnswer: "The lookup completed." }
});
const result = await agent.wakiilAI({
  task: "Look up a topic",
  tools: [{
    name: "lookup",
    schema: {
      type: "object",
      properties: { topic: { type: "string" } },
      required: ["topic"],
      additionalProperties: false
    },
    execute: async ({ topic }) => `Result for ${topic}`
  }]
});
console.log(result.answer);
```

Agent limits: `maxSteps` defaults to 5 (range 1–10); `maxExecutionMs` defaults
to 30000 (range 1–120000). An optional `signal`, `approve`, and JSON-compatible
`memory` are supported. This is a local SDK loop, not a built-in provider
agent feature.

## Usage and token tracking

Requests made through the client are tracked. `cabirIsticmaalka()` returns
aggregate request counts, duration, provider/model totals, and token counts
when the provider reports them. Cost is estimated only with explicit rates:

```js
const metered = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-3.8-flash",
  pricing: {
    gemini: { inputPerMillion: 0.1, outputPerMillion: 0.4 }
  }
});
await metered.weydii("Salaan!");
console.log(metered.cabirIsticmaalka());
console.log(metered.cabirIsticmaalka({ reset: true }));
```

Rates above are illustrative only; use the current rate card for your
provider/model. Token usage is actual only when reported. Cost and usage are
not guaranteed to be present in every provider response or stream.

## API reference

### Text and conversation methods (24)

All return `Promise<AIResponse>` except `nadiifi()` below. Text methods accept a
non-empty string and optional `AIRequestOptions`. `AIResponse` has `text`,
`provider`, `model`, optional `usage`, and provider-specific fields.

| Method | Parameters | Behavior and example |
| --- | --- | --- |
| `weydii(question, options?)` | `string` or `{ question?: string; "su'aal"?: string }`; options include `signal` | Ask a question. `await ai.weydii("Salaan!")` |
| `wadaSheekeysi(message, options?)` | message string; request options | Start/continue stored history. `await ai.wadaSheekeysi("Salaan!")` |
| `siiWad(message, options?)` | message string; request options | Continue existing history; errors if none exists. `await ai.siiWad("Sii wad.")` |
| `turjun(text, targetLanguage, options?)` | two non-empty strings; request options | Translation request. `await ai.turjun("Hello", "Somali")` |
| `sooKoob(text, options?)` | text string; request options | Summarize. `await ai.sooKoob("Long text...")` |
| `sharax(text, options?)` | text string; request options | Explain. `await ai.sharax("Gravity")` |
| `sax(text, options?)` | text string; request options | Correct spelling/grammar. `await ai.sax("She go home.")` |
| `dibUqor(text, options?)` | text string; request options | Rewrite while preserving meaning. `await ai.dibUqor("Draft...")` |
| `hagaaji(text, options?)` | text string; request options | Improve clarity/style. `await ai.hagaaji("Draft...")` |
| `balaadhi(text, options?)` | text string; request options | Expand with relevant detail. `await ai.balaadhi("Short idea.")` |
| `qor(request, options?)` | content-request string; request options | Write requested content. `await ai.qor("Write a short email.")` |
| `curi(request, options?)` | content-request string; request options | Create original content. `await ai.curi("Create a fable.")` |
| `fikrado(topic, options?)` | topic string; request options | Generate ideas. `await ai.fikrado("Solar energy")` |
| `cinwaan(text, options?)` | text string; request options | Generate possible titles. `await ai.cinwaan("Article text...")` |
| `sameeSuaalo(text, options?)` | text string; request options | Generate questions. `await ai.sameeSuaalo("Lesson text...")` |
| `falanqee(text, options?)` | text string; request options | Analyze key points. `await ai.falanqee("Argument...")` |
| `kalaSaar(text, categoriesOrOptions?, options?)` | text; category string array or `{ categories, ...requestOptions }`; optional third options with category array | Classify; category list may be omitted. `await ai.kalaSaar("Late delivery", ["positive", "negative"])` |
| `dareen(text, options?)` | text string; request options | Analyze sentiment/tone. `await ai.dareen("I love it.")` |
| `sooSaarXog(text, options?)` | text string; request options | Extract key information. `await ai.sooSaarXog("Name: Ayaan; city: Hargeisa.")` |
| `isbarbarDhig(items, options?)` | at least two strings as array, or separate strings; optional options | Compare items. `await ai.isbarbarDhig(["A", "B"])` |
| `qorCode(request, options?)` | code-request string; request options | Generate code. `await ai.qorCode("Write a JS sum function.")` |
| `sharaxCode(code, options?)` | code string; request options | Explain code. `await ai.sharaxCode("const n = 1;")` |
| `saxCode(code, options?)` | code string; request options | Fix code. `await ai.saxCode("const n = ;")` |
| `dibUhabeeCode(code, options?)` | code string; request options | Refactor without intended behavior change. `await ai.dibUhabeeCode("function f(x){return x+1}")` |

`AIRequestOptions`: optional `bixiye`, `moodel`, `tilmaamo`, `language`,
deprecated `provider`/`model`, and (where used) `signal`. `moodel` does not
mutate a live provider's model. Calls reject invalid text/options and rethrow
provider or network errors after redacting known API keys.

### Client utilities and advanced methods (24)

| Method | Parameters and return | Example, error, or limitation |
| --- | --- | --- |
| `nadiifi(options?)` | `{ bixiye?: ProviderId }` → `boolean` | `ai.nadiifi()` clears all conversation histories; may clear one with `{ bixiye: "gemini" }`. |
| `doorModel(options?)` | `ModelSelectionOptions` → selection metadata | `ai.doorModel({ task: "coding" })`. Requires a configured candidate; validates tasks, providers, capabilities, and model IDs. |
| `awoodahaModelka(options?)` | `{ bixiye?, moodel? }` → capability report | `ai.awoodahaModelka()`. Reports adapter-level capabilities, not live model/account support. |
| `raadsoAqoon(input)` | question, documents, retrieval settings → `{ answer, sources, hasEnoughInformation, provider, model }` | `await ai.raadsoAqoon({ question: "…", documents: [{ id: "a", content: "…" }] })`. Requires nonempty documents; semantic mode requires embeddings. |
| `ogaawLuqad(input)` | text or `{ text }` → language-detection record | `ai.ogaawLuqad("Waa salaaman tahay")`. Local heuristic; confidence is uncalibrated. |
| `ogaawLahjad(input)` | text or `{ text, bixiye?, language? }` → dialect record or promise | `ai.ogaawLahjad("Qoraal Soomaali")`. Bundled adapters do not verify Somali dialect; normally returns `unknown`. |
| `caadiyeQoraal(input)` | text or `{ text }` → normalized string/record | `ai.caadiyeQoraal("  Salaan   wanaagsan ")`. Local whitespace/text normalization; rejects empty input. |
| `hadalUqor(input)` | `{ audio, mimeType?, ...AIRequestOptions }` → `Promise<AIResponse>` | `await ai.hadalUqor({ audio, mimeType: "audio/wav" })`. Needs `speech-recognition` adapter; media max 25 MB. |
| `qoraalUhadal(input)` | `{ text, ...AIRequestOptions }` → `Promise<Record>` | `await ai.qoraalUhadal({ text: "Salaan" })`. Needs `text-to-speech` adapter. |
| `wakiilAI(input)` | task, tools, limits, optional signal/approve/memory → `Promise<Record>` | See [agent example](#registered-tools-and-agents). Requires adapter `generateWithTools`; tool execution is application code. |
| `falanqeeSawir(input)` | `{ image, prompt, mimeType?, ...AIRequestOptions }` → `Promise<AIResponse>` | Needs `image-understanding` adapter; image max 25 MB and valid image MIME type. |
| `falanqeeDukumenti(input)` | `{ document, prompt, mimeType?, ...AIRequestOptions }` → `Promise<AIResponse>` | Needs `document-understanding` adapter; PDF, RTF, DOCX and text MIME types, max 25 MB. |
| `sooSaarJSON(input)` | `{ prompt, schema, ...AIRequestOptions }` → `{ data, provider, model, usage? }` | See [structured JSON](#structured-json-with-a-custom-adapter). Needs `generateStructured`; rejects invalid JSON/schema. |
| `sameeEmbedding(input)` | `{ text? \| texts?, ...AIRequestOptions }` → `{ embeddings, provider, model, usage? }` | `await ai.sameeEmbedding({ text: "Somali text" })`. Needs adapter `createEmbedding`; checks vector shape and dimensions. |
| `isuEegEmbedding(left, right)` | two `number[]` → cosine similarity `number` | `ai.isuEegEmbedding([1, 0], [0, 1])`. Equal nonzero dimensions required. |
| `sameeSawir(input)` | `{ prompt, ...AIRequestOptions }` → `{ images, provider, model }` | Needs adapter `generateImage`; rejects empty/unusable image output. |
| `sameeMuuqaal(input)` | `{ prompt, ...AIRequestOptions }` → `VideoJob` | Needs `generateVideo`; returns job with id and supported status. |
| `hubiMuuqaal(input)` | `{ id, ...AIRequestOptions }` → `Promise<VideoJob>` | Needs `getVideoJob`; returned job id must match. |
| `helMuuqaal(input)` | `{ id, ...AIRequestOptions }` → `Promise<unknown>` | Needs `getVideoResult`; completed job output required. |
| `joojiMuuqaal(input)` | `{ id, ...AIRequestOptions }` → `Promise<unknown>` | Needs `cancelVideoJob`. |
| `qulqul(input)` | `{ prompt, bixiye?, tilmaamo?, language?, signal? }` → `AsyncIterable<AIStreamChunk>` | See [streaming](#conversations-streaming-and-cancellation). Requires adapter `stream`. |
| `cabirIsticmaalka(options?)` | `{ reset?: boolean }` → usage snapshot | `ai.cabirIsticmaalka({ reset: true })` returns then resets counters. |
| `getConfig()` | no args → public safe config | `ai.getConfig()`. API keys/provider secrets are not returned. |
| `getProviders()` | no args → `string[]` | `ai.getProviders()`. Lists adapters currently registered in this client. |

The `ai.providers` registry exposes three additional methods:

| Method | Parameters and return | Example |
| --- | --- | --- |
| `ai.providers.register(name, adapter)` | `string`, `ProviderAdapter` → `void` | `ai.providers.register("custom", { generate: async () => ({ text: "ok" }) })` |
| `ai.providers.get(name)` | `string` → adapter; throws if missing | `ai.providers.get("custom")` |
| `ai.providers.list()` | no args → `string[]` | `ai.providers.list()` |

### Exported package utilities

`src/index.js` exports `abuurAI`, `version`, `somaliPromptTemplates`,
`getSomaliPromptTemplate(id)`, and `renderSomaliPromptTemplate(id, values)`.
There are no public `createAbuurAI` or `createSomaliAI` factories.

```js
import {
  getSomaliPromptTemplate,
  renderSomaliPromptTemplate,
  somaliPromptTemplates,
  version
} from "abuur-ai";

console.log(version, somaliPromptTemplates.length);
console.log(getSomaliPromptTemplate("coding").name);
console.log(renderSomaliPromptTemplate("translation", {
  prompt: "Hello",
  targetLanguage: "Somali"
}));
```

`getSomaliPromptTemplate(id)` returns a template or throws for an invalid
unknown ID. `renderSomaliPromptTemplate(id, { prompt, targetLanguage? })`
returns a rendered prompt; `prompt` must be nonempty and the default
`targetLanguage` placeholder is a generic selected-language phrase.

## Browser and Node.js

### Node.js backend (recommended for private keys)

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "anthropic",
  furahaAPI: process.env.ANTHROPIC_API_KEY,
  moodel: "claude-sonnet-5-5"
});
console.log((await ai.weydii("Salaan!")).text);
```

The Node entry supports all twelve providers. Store production credentials in
deployment secrets or server environment variables. `.env` loading is the
application's responsibility.

### Browser entry

Import `abuurAI` from `abuur-ai/browser`. The browser entry supports Gemini,
OpenRouter, Ollama, Perplexity, Meta, and NVIDIA. The browser Gemini adapter is
direct and generation-only; the HTTP adapters use Fetch and expose streaming.
All browser requests expose their API keys and may be subject to CORS/provider
policy. Do not put private production keys in frontend code. For production,
call your own backend instead:

```js
import { abuurAI } from "abuur-ai/browser";

// Use only a restricted, low-limit test key in a browser demo.
const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: import.meta.env.VITE_GEMINI_TEST_KEY,
  moodel: "gemini-3.8-flash"
});
console.log((await ai.weydii("Salaan!")).text);
```

The `VITE_` prefix is intentionally public in Vite builds; it is not secret
storage.

## Errors and troubleshooting

Wrap asynchronous model calls in `try/catch`:

```js
try {
  const response = await ai.weydii("Salaan!");
  console.log(response.text);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Cancelled");
  } else {
    console.error("AI request failed:", error.message);
  }
}
```

Common issues:

- **Missing key:** confirm the selected provider's exact environment variable
  is set before Node starts, or pass `furahaAPI`.
- **Invalid model:** use the exact current provider model ID; aliases,
  permissions, and retired IDs differ by account and endpoint.
- **Wrong key/provider pairing:** keys are provider-specific and not shared.
- **Ollama connection refused:** install/pull the model, start `ollama serve`,
  and check `OLLAMA_HOST` or `cinwaankaAPI`.
- **Perplexity legacy endpoint:** see its [migration limitation](#supported-providers-and-models).
- **CORS or browser authentication:** use the Node backend; SDK adapters
  cannot conceal a browser key or bypass provider CORS policy.
- **Streaming unsupported:** Gemini's browser adapter does not implement
  `stream`; check `awoodahaModelka()` or use the Node entry.
- **Unsupported media/agent method:** bundled providers do not implement
  images, documents, speech, embeddings, JSON-schema output, video, dialect
  detection, or native tool calling. Register an adapter implementing the
  required method and capability.
- **Automatic mode doesn't fail over:** selection is not retry/failover.

HTTP errors are converted to provider-prefixed messages; common authentication,
rate-limit, and network errors are normalized. Known API-key strings are
redacted by error handling, but applications should still avoid logging
prompts, raw provider payloads, or secrets.

## TypeScript

Type declarations ship with the package. Import `AbuurAIOptions`, `ProviderId`,
`ProviderAdapter`, `AIResponse`, `AIRequestOptions`, and related types as needed:

```ts
import { abuurAI, type AbuurAIOptions } from "abuur-ai";

const options: AbuurAIOptions = {
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-3.8-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
};
const ai = abuurAI(options);
const answer = await ai.weydii("Salaan!");
console.log(answer.text);
```

`ProviderId` is the union of the twelve supported IDs. The TypeScript client
also declares all methods listed above. Advanced capabilities are typed on
the client but still reject at runtime unless the selected adapter implements
them.

## FAQ

**Does the SDK call an AI model without a key?** Only local Ollama does not
require a key. Other bundled providers require their own key and model.

**Does Abuur AI choose a model automatically?** Gemini has the current
implementation fallback `gemini-2.5-flash`, which is deprecated/limited for
new users. Specify a current model explicitly. Other providers require a
model ID.

**Can I switch providers per request?** Yes, `bixiye` can select an initialized
or configured provider. In `auto` mode it must be configured.

**Does automatic mode retry after an error?** No. It selects a candidate; it
does not implement failover.

**Can I use embeddings or native tools with the bundled integrations?** No.
These require a custom adapter that implements the corresponding method and
capability.

**Are all provider models equally capable?** No. Capability reporting
describes the adapter, not each model, account, endpoint, or entitlement.

**Where is the Somali prompt utility?** Use the exported
`somaliPromptTemplates`, `getSomaliPromptTemplate()`, and
`renderSomaliPromptTemplate()` functions. These utilities render prompts; they
do not make model requests.

## Contributing, support, and license

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding conventions, and
test instructions. Report security issues privately as described in
[SECURITY.md](./SECURITY.md). For questions and bug reports, use the
[GitHub repository](https://github.com/Amad55a/somali-ai-connect) and do not
include secrets or personal data. Licensed under the [MIT License](./LICENSE).
