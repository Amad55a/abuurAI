# Abuur AI — advanced configuration

Abuur AI uses `abuurAI()` and Somali-first configuration names:
`bixiye`, `furahaAPI`, `moodel`, and `tilmaamo`. See the
[main guide](./README.md) for installation and basic usage.

## Provider-specific configuration

Set a provider's environment variable in your server process, or configure
several providers using the same Somali names:

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  mode: "auto",
  providers: {
    gemini: {
      furahaAPI: process.env.GEMINI_API_KEY,
      moodel: "gemini-3.8-flash"
    },
    anthropic: {
      furahaAPI: process.env.ANTHROPIC_API_KEY,
      moodel: "claude-sonnet-5-5"
    }
  },
  providerPreference: ["gemini", "anthropic"],
  taskProviderPreferences: {
    coding: ["anthropic", "gemini"]
  },
  tilmaamo: "Ku jawaab Af-Soomaali haddii luqad kale la codsan waayo."
});

const selection = ai.doorModel({
  task: "coding",
  preferredProvider: "anthropic"
});
console.log(selection.provider, selection.model);
```

Automatic mode considers configured providers in order. It does not retry on a
different provider when an inference request fails. Provider IDs and model IDs
are the values used by the provider APIs; Abuur AI does not rename them,
discover models, or verify account access.

## Browser and server-side safety

The browser entry directly supports Gemini, OpenRouter, Ollama, Perplexity,
Meta, and NVIDIA. Direct browser requests require provider credentials for
hosted services, and anyone using the browser bundle can inspect those keys.
For production keys, have the browser call your own trusted backend server
instead.

## Conversation and request options

`wadaSheekeysi()` starts a conversation and `siiWad()` continues the selected
provider's in-memory conversation. `nadiifi()` clears its history:

```js
await ai.wadaSheekeysi("Aan ka hadalno waxbarashada.");
const next = await ai.siiWad("Soo koob taladaada.");
ai.nadiifi();
```

You can override provider selection for a request using `bixiye`:

```js
const answer = await ai.weydii("Salaan!", { bixiye: "anthropic" });
```

For model selection before a request, use `doorModel()`; configure each
provider's actual model in `moodel` or `providers.<id>.moodel`.

## Somali utilities

`raadsoAqoon()` chunks local documents, ranks passages with lexical term
matching, and sends relevant excerpts to the configured provider:

```js
const result = await ai.raadsoAqoon({
  question: "What does this document say about education?",
  documents: [
    { id: "education", content: "Education supports national development." }
  ]
});
```

This is not semantic search. Relevant document text is included in the
provider request and may contain sensitive information; only send text you
are allowed to share. The returned answer is model-generated and may be wrong.

`ogaawLuqad()` and `caadiyeQoraal()` are local helpers. Language detection is
heuristic and does not guarantee a language or dialect classification.

## Capabilities and streaming

The twelve Node provider adapters implement text generation and streaming,
subject to each provider's API and model support. The Gemini browser adapter
does not implement streaming. `awoodahaModelka()` reports adapter-level
functionality, not live model availability. The bundled adapters do not
implement image/audio/video generation or analysis, embeddings, structured
output, native tool calling, or dialect detection. Those operations require an
appropriate custom adapter and otherwise reject with an explicit
unsupported-capability error.

Consume text deltas with `qulqul()`:

```js
for await (const chunk of ai.qulqul({ prompt: "Salaan!" })) {
  if (chunk.text) process.stdout.write(chunk.text);
}
```

Streaming, token-usage reporting, and model support depend on the exact
provider/model response. The automated test suite mocks provider responses;
it does not verify live models, billing, or entitlements.
