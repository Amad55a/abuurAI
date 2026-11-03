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
      systemPrompt: options.tilmaamo || options.instructions || systemPrompt,
      signal: options.signal
    });
  };
}