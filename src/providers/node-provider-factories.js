import { createOpenAIProvider } from "./openai-provider.js";
import { createGeminiProvider } from "./gemini-provider.js";
import { createAnthropicProvider } from "./anthropic-provider.js";
import { createMistralProvider } from "./mistral-provider.js";
import { createDeepSeekProvider } from "./deepseek-provider.js";
import { createCohereProvider } from "./cohere-provider.js";
import { createXAIProvider } from "./xai-provider.js";
import { createOpenRouterProvider } from "./openrouter-provider.js";
import { createOllamaProvider } from "./ollama-provider.js";
import { createPerplexityProvider } from "./perplexity-provider.js";
import { createMetaProvider } from "./meta-provider.js";
import { createNvidiaProvider } from "./nvidia-provider.js";

export const nodeProviderFactories = {
  openai: createOpenAIProvider,
  gemini: createGeminiProvider,
  anthropic: createAnthropicProvider,
  mistral: createMistralProvider,
  deepseek: createDeepSeekProvider,
  cohere: createCohereProvider,
  xai: createXAIProvider,
  openrouter: createOpenRouterProvider,
  ollama: createOllamaProvider,
  perplexity: createPerplexityProvider,
  meta: createMetaProvider,
  nvidia: createNvidiaProvider
};
