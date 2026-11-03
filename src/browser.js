import { createAbuurAI } from "./core/client.js";
import { createGeminiBrowserProvider } from "./providers/gemini-browser-provider.js";
export {
  getSomaliPromptTemplate,
  renderSomaliPromptTemplate,
  somaliPromptTemplates
} from "./somali/prompt-library.js";

export function abuurAI(options = {}) {
  return createAbuurAI(options, { gemini: createGeminiBrowserProvider });
}

/** @deprecated Use abuurAI. */
export const createSomaliAI = abuurAI;

export const version = "0.2.0";
