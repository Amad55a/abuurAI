import { createAbuurAI } from "./core/client.js";
import { nodeProviderFactories } from "./providers/node-provider-factories.js";
export {
  getSomaliPromptTemplate,
  renderSomaliPromptTemplate,
  somaliPromptTemplates
} from "./somali/prompt-library.js";

export function abuurAI(options = {}) {
  return createAbuurAI(options, nodeProviderFactories);
}

/** @deprecated Use abuurAI. */
export const createSomaliAI = abuurAI;

export const version = "0.2.0";