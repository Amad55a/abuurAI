import { createAbuurAI } from "./core/client.js";
import { createGeminiBrowserProvider } from "./providers/gemini-browser-provider.js";
import { createOpenRouterProvider } from "./providers/openrouter-provider.js";
import { createOllamaProvider } from "./providers/ollama-provider.js";
import { createPerplexityProvider } from "./providers/perplexity-provider.js";
import { createMetaProvider } from "./providers/meta-provider.js";
import { createNvidiaProvider } from "./providers/nvidia-provider.js";

export {
  getSomaliPromptTemplate,
  renderSomaliPromptTemplate,
  somaliPromptTemplates
} from "./somali/prompt-library.js";

const browserProviderFactories = {
  gemini: createGeminiBrowserProvider,
  openrouter: createOpenRouterProvider,
  ollama: createOllamaProvider,
  perplexity: createPerplexityProvider,
  meta: createMetaProvider,
  nvidia: createNvidiaProvider
};

export function abuurAI(options = {}) {
  return createAbuurAI(options, browserProviderFactories);
}

export const version = "0.2.0";
