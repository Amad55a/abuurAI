export function createPromptInstructions({
  language = "automatic",
  systemPrompt,
  operationInstructions
}) {
  const languageInstruction =
    language === "automatic"
      ? "Respond in the same language as the user's message. For Somali responses, use natural, standard Somali spelling and grammar."
      : `Respond in ${language}.`;

  const instructions = [languageInstruction];

  if (systemPrompt) {
    instructions.push(`Global developer instructions:\n${systemPrompt}`);
  }

  if (operationInstructions) {
    instructions.push(
      `Mandatory operation requirements, taking precedence over conflicting global developer instructions:\n${operationInstructions}`
    );
  }

  return instructions.join("\n\n");
}
