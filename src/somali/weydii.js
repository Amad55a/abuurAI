/**
 * Somali AI Connect
 * Somali question method
 */

export function createWeydii(provider, systemPrompt) {
  return async function weydii(question, options = {}) {
    if (!question || typeof question !== "string") {
      throw new Error("Please provide a valid question.");
    }

    if (!provider || typeof provider.generate !== "function") {
      throw new Error("A valid AI provider is required.");
    }

    return provider.generate({
      prompt: question,
      language: options.language || "automatic",
      systemPrompt
    });
  };
}