import { createOpenAIProvider } from "./openai-provider.js";
import { createGeminiProvider } from "./gemini-provider.js";
import { createAnthropicProvider } from "./anthropic-provider.js";
import { createMistralProvider } from "./mistral-provider.js";
import { createDeepSeekProvider } from "./deepseek-provider.js";
import { createCohereProvider } from "./cohere-provider.js";
import { createXAIProvider } from "./xai-provider.js";

export const nodeProviderFactories = {
  openai: createOpenAIProvider,
  gemini: createGeminiProvider,
  anthropic: createAnthropicProvider,
  mistral: createMistralProvider,
  deepseek: createDeepSeekProvider,
  cohere: createCohereProvider,
  xai: createXAIProvider
};
