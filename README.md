# Somali AI Connect

A Somali-first JavaScript SDK for OpenAI, Google Gemini, Anthropic Claude,
Mistral AI, DeepSeek, Cohere, and xAI Grok. Requires Node.js 22 or later.

## Install

```sh
npm install somali-ai-connect
```

## Use

Set the environment variable for your provider in the server process, then
create a client. Supported provider identifiers and environment variables:

| Provider | Identifier | Environment variable |
| --- | --- | --- |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |
| Anthropic Claude | `anthropic` | `ANTHROPIC_API_KEY` |
| Mistral AI | `mistral` | `MISTRAL_API_KEY` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| Cohere | `cohere` | `COHERE_API_KEY` |
| xAI Grok | `xai` | `XAI_API_KEY` |

Select a model supported by your provider and configure its exact model ID:

```js
import { createSomaliAI } from "somali-ai-connect";

const ai = createSomaliAI({
  provider: "gemini",
  model: "gemini-2.5-flash",
  systemPrompt: "Always respond in professional Somali."
});

const answer = await ai.weydii("Waa maxay AI?");
console.log(answer.text);

const translation = await ai.turjun("Hello, how are you?", "Somali");
console.log(translation.text);
```

The additional providers use the same client configuration pattern:

```js
const ai = createSomaliAI({
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "your-supported-model"
});
```

`systemPrompt` adds global developer instructions to requests. Operation
requirements take precedence when necessary, including `turjun()`'s
translation-only output requirement. You may instead pass a private `apiKey`
when creating the client.

The SDK does not load dotenv files. Load environment variables in your
application if needed. Keep provider keys on a trusted server; a key placed in
browser code or a browser bundle can be exposed, and the SDK cannot prevent
that.

## Default and automatic provider selection

With no `provider`, the SDK defaults to Gemini (`gemini-2.5-flash`); set
`GEMINI_API_KEY` or pass `apiKey`. Manual selection remains the default mode:

```js
const ai = createSomaliAI({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "your-supported-model"
});
```

Automatic mode considers only providers configured with both a key and model.
It chooses the first configured candidate unless a preference or restriction
is supplied. It does not silently switch providers after a request fails.
Configure exact model IDs for each provider:

```js
const ai = createSomaliAI({
  mode: "auto",
  providers: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: "your-supported-gemini-model"
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "your-supported-anthropic-model"
    }
  },
  taskProviderPreferences: {
    coding: ["anthropic", "gemini"]
  }
});

const selection = ai.doorModel({
  task: "coding",
  allowedProviders: ["anthropic", "gemini"]
});
```

`doorModel()` returns the selected provider, configured model, task, reason,
and ordered candidates. It does not claim to benchmark models or infer provider
capabilities. Supported tasks are `translation`, `summarization`, `writing`,
`coding`, `reasoning`, `classification`, and `conversation`.

## Knowledge search

`raadsoAqoon()` chunks documents and ranks passages locally by term overlap,
then asks the configured provider to answer from the retrieved passages:

```js
const result = await ai.raadsoAqoon({
  question: "What does this document say about education?",
  documents: [
    { id: "education", content: "Education supports national development." }
  ]
});

console.log(result.answer);
console.log(result.sources); // IDs and excerpts of retrieved passages
```

Document text is held only for the duration of the call and is not logged or
stored by the SDK. Relevant passages are sent to the configured external AI
provider to generate an answer. Local retrieval is lexical, not semantic; a
missing match is reported as insufficient information, and generated answers
may still be inaccurate.

## Language detection

`ogaawLuqad()` is a local heuristic and does not make an AI request:

```js
const language = ai.ogaawLuqad({
  text: "Asc, how are you maanta?"
});
// { language: "mixed", languages: ["so", "en"], ... }
```

The confidence value is an uncalibrated heuristic score, not a probability.
Very short or unrecognized text returns `language: "unknown"`.

## Streaming

`qulqul()` returns an async iterable of `{ text, provider, model }` chunks.
Use an `AbortSignal` to cancel:

```js
const controller = new AbortController();
for await (const chunk of ai.qulqul({
  prompt: "Explain artificial intelligence in Somali.",
  signal: controller.signal
})) {
  process.stdout.write(chunk.text);
}
```

Streaming is implemented for the seven bundled providers. User-registered
providers must implement `stream()` or the SDK returns an unsupported-capability
error. Stream chunks do not include token usage unless the provider emits it.

## Usage monitoring

`cabirIsticmaalka()` reports local request counts, provider/model counts,
durations, and provider-reported token counts when present. Unavailable token
counts and costs are `null`; prompt and document contents are not collected.
Costs are estimated only with user-supplied per-million-token prices:

```js
const ai = createSomaliAI({
  provider: "gemini",
  pricing: {
    gemini: {
      "your-supported-gemini-model": {
        inputPerMillion: 0.1,
        outputPerMillion: 0.4
      }
    }
  }
});

const usage = ai.cabirIsticmaalka();
ai.cabirIsticmaalka({ reset: true }); // return current snapshot, then reset
```

Prices are examples only; configure current values from your provider. The
SDK does not make pricing assumptions.

## Feature compatibility

| Feature | OpenAI | Gemini | Anthropic | Mistral | DeepSeek | Cohere | xAI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Text generation / RAG answer | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Streaming | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Provider-reported token usage | When returned | When returned | When returned | When returned | When returned | When returned | When returned |
| Local language detection / retrieval | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

Model-specific availability and provider account limits still apply. The
SDK does not retry failed requests or automatically switch providers.
