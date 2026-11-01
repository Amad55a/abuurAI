# Somali AI Connect

A Somali-first JavaScript SDK for OpenAI, Google Gemini, Anthropic Claude,
Mistral AI, DeepSeek, Cohere, and xAI Grok. Requires Node.js 22 or later.

Somali AI Connect is a Somali-led project welcoming developers in Somalia and
the Somali diaspora, as well as everyone interested in building useful
Somali-first developer tools.

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

## Capability-aware operations

`awoodahaModelka()` reports capabilities implemented by the configured adapter
without exposing credentials. It does not probe a provider or guarantee that a
specific model or account accepts a request. `doorModel()` can filter configured
providers using `capability` and `allowedModels`; selection is deterministic and
never retries on another provider:

```js
const report = ai.awoodahaModelka();
const selection = ai.doorModel({
  task: "reasoning",
  capability: "text-generation"
});
```

By default, the seven bundled adapters expose text generation, conversation,
and their streaming interface. The bundled adapters do **not** currently
implement voice, image/document analysis, image/video generation, structured
output, embeddings, dialect detection, or native tool calling. Those operations
reject with an explicit unsupported-capability error rather than pretending a
text request completed them.

Custom registered adapters can expose these optional operations and declare
model capabilities. The declaration is intersected with methods actually
implemented by the adapter:

```js
ai.providers.register("my-adapter", {
  model: "my-configured-model",
  capabilities: ["text-generation", "image-understanding"],
  generate: async ({ prompt }) => ({ text: prompt }),
  analyzeImage: async ({ image, prompt }) => ({
    text: "Adapter-specific image result"
  })
});

const capabilityReport = ai.awoodahaModelka({ provider: "my-adapter" });
const image = await ai.falanqeeSawir({
  provider: "my-adapter",
  image: imageBytes,
  prompt: "Describe this image in Somali."
});
```

Optional adapter methods are `transcribeAudio`, `synthesizeSpeech`,
`analyzeImage`, `analyzeDocument`, `generateImage`, `generateVideo`,
`getVideoJob`, `getVideoResult`, `cancelVideoJob`, `generateStructured`,
`createEmbedding`, `generateWithTools`, and `detectDialect`. Capability names
match the strings returned by `awoodahaModelka()`. A provider configuration's
`capabilities` array can explicitly declare/allow adapter features or restrict
them, but it never creates a missing adapter method:

```js
const ai = createSomaliAI({
  mode: "auto",
  providers: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: "your-verified-model",
      capabilities: ["text-generation", "conversation", "streaming"]
    }
  }
});
```

This is adapter-level support metadata, not automatic model discovery; configure
only capabilities you have verified for the exact model and account.

`hadalUqor()` and `qoraalUhadal()` pass audio/text and language options to an
adapter; format, MIME-type, voice, and language support remain adapter-specific.
Media values are limited to 25 MB by the SDK. Audio and image inputs need a
matching MIME type (provided directly, by a `Blob`/`File`, or image data URI);
documents accept text MIME types, PDF, RTF, or DOCX metadata. MIME metadata
cannot guarantee the bytes match the claimed format. No Somali voice support
is claimed by the bundled adapters. `ogaawLahjad()` reports `unknown` unless a
registered adapter declares and implements dialect detection.

`wakiilAI()` requires an adapter implementing `generateWithTools` and only
executes functions explicitly supplied in `tools`. Tool arguments are checked
against the supported JSON Schema subset. Tools marked `requiresApproval` need
an `approve` callback; no shell or arbitrary-code tool is provided. Set
`maxSteps` (1–10), `maxExecutionMs` (1–120000), and optionally pass an
`AbortSignal`. Cancellation depends on the adapter/tool honoring the signal.
Memory is opt-in: pass a JSON-compatible `memory` array and retain the returned
array yourself; the SDK does not persist it.

`sooSaarJSON()` requires an adapter's structured-output implementation and
validates parsed output. Its validator supports basic JSON Schema types,
properties, required fields, items, enums, numeric/string bounds, and
`additionalProperties`; unsupported schema keywords are rejected.

`sameeEmbedding()` supports one or multiple texts through an adapter's
`createEmbedding` method. `isuEegEmbedding()` computes cosine similarity for
same-dimension, non-zero vectors. `raadsoAqoon()` uses local lexical retrieval
by default; `strategy: "semantic"` requires an embedding-capable adapter and an
explicit `embeddingModel`. An optional `vectorStore` can implement
`search(vector, options)` and optionally `upsert(records, options)`. It must
declare matching `embeddingModel` and vector `dimensions`; documents are sent
to its `upsert` only when `indexDocuments: true`. Vector-store adapters are
provided by the application, not bundled with the SDK.

`sameeMuuqaal()` returns the adapter's real job ID and status. `hubiMuuqaal()`,
`helMuuqaal()`, and `joojiMuuqaal()` delegate status, retrieval, and cancellation
to optional adapter methods; output retrieval is rejected until the adapter
reports completion.

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
`caadiyeQoraal()` performs local Unicode NFC and whitespace normalization; it
does not rewrite Somali vocabulary or infer dialect.

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

| Bundled adapter operation | OpenAI | Gemini | Anthropic | Mistral | DeepSeek | Cohere | xAI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Text generation / conversation | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Streaming interface | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Provider-reported token usage | When returned | When returned | When returned | When returned | When returned | When returned | When returned |
| Local heuristic language detection / lexical retrieval | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

Model-specific availability and provider account limits still apply. The
SDK does not retry failed requests or automatically switch providers.

## Somali developer community

Soo dhawoow — welcome, Somali developers everywhere! You can help improve
Somali language support, add tests using fake providers, report bugs, clarify
examples, or contribute code. Beginners are welcome, and you do not need to
be an expert or a native Somali speaker to participate.

Start with the [contribution guide](CONTRIBUTING.md), review our
[Code of Conduct](CODE_OF_CONDUCT.md) and [security policy](SECURITY.md), and
see [contributor recognition](CONTRIBUTORS.md). Please keep API keys and
personal information out of public issues and pull requests.

- [Report an issue](https://github.com/Amad55a/somali-ai-connect/issues)
- [Join a discussion](https://github.com/Amad55a/somali-ai-connect/discussions)

Contributors are credited only for verified contributions and by their
preferred attribution; see [CONTRIBUTORS.md](CONTRIBUTORS.md).
