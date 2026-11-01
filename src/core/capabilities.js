export const SUPPORTED_CAPABILITIES = [
  "text-generation",
  "conversation",
  "reasoning",
  "tool-calling",
  "structured-output",
  "image-understanding",
  "image-generation",
  "video-generation",
  "audio-input",
  "speech-recognition",
  "text-to-speech",
  "embeddings",
  "streaming",
  "document-understanding",
  "dialect-detection"
];

const adapterMethods = {
  "text-generation": "generate",
  conversation: "generate",
  reasoning: "generateReasoning",
  "tool-calling": "generateWithTools",
  "structured-output": "generateStructured",
  "image-understanding": "analyzeImage",
  "document-understanding": "analyzeDocument",
  "image-generation": "generateImage",
  "video-generation": "generateVideo",
  "audio-input": "processAudio",
  "speech-recognition": "transcribeAudio",
  "text-to-speech": "synthesizeSpeech",
  embeddings: "createEmbedding",
  streaming: "stream",
  "dialect-detection": "detectDialect"
};

export function getAdapterCapabilities(provider, configuredCapabilities) {
  const declared = Object.entries(adapterMethods)
    .filter(([, method]) => typeof provider?.[method] === "function")
    .map(([capability]) => capability);

  if (!Array.isArray(configuredCapabilities)) {
    return declared;
  }
  return declared.filter((capability) => configuredCapabilities.includes(capability));
}

export function getCapabilityMethod(capability) {
  return adapterMethods[capability];
}
