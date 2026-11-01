import { SUPPORTED_CAPABILITIES } from "./capabilities.js";

export const SUPPORTED_PROVIDER_IDS = [
  "openai",
  "gemini",
  "anthropic",
  "mistral",
  "deepseek",
  "cohere",
  "xai"
];

export const SUPPORTED_TASKS = [
  "translation",
  "summarization",
  "writing",
  "coding",
  "reasoning",
  "classification",
  "conversation"
];

const defaultGeminiModel = "gemini-2.5-flash";
const environmentVariables = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  mistral: "MISTRAL_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  cohere: "COHERE_API_KEY",
  xai: "XAI_API_KEY"
};

function isProviderConfigured(provider, config) {
  const providerOptions = config.providers?.[provider] || {};
  const apiKey =
    providerOptions.apiKey ||
    (provider === config.provider || (!config.provider && provider === "gemini")
      ? config.apiKey
      : null) ||
    process.env[environmentVariables[provider]];
  const model =
    providerOptions.model ||
    (provider === config.provider || (!config.provider && provider === "gemini")
      ? config.model
      : null) ||
    (provider === "gemini" ? defaultGeminiModel : null);

  return Boolean(apiKey && model);
}

export function getProviderOptions(provider, config) {
  const providerOptions = config.providers?.[provider] || {};

  return {
    ...providerOptions,
    apiKey:
      providerOptions.apiKey ||
      (provider === config.provider || (!config.provider && provider === "gemini")
        ? config.apiKey
        : null) ||
      undefined,
    model:
      providerOptions.model ||
      (provider === config.provider || (!config.provider && provider === "gemini")
        ? config.model
        : null) ||
      (provider === "gemini" ? defaultGeminiModel : null),
    fetch: providerOptions.fetch || config.fetch
  };
}

export function createModelSelector(config, supportsCapability = () => false) {
  function getCandidates() {
    if (config.mode === "auto") {
      return Object.keys(config.providers || {}).filter((provider) =>
        SUPPORTED_PROVIDER_IDS.includes(provider) &&
        isProviderConfigured(provider, config)
      );
    }

    const provider = config.provider || "gemini";
    return isProviderConfigured(provider, config) ? [provider] : [];
  }

  function getConfiguredProviders() {
    return SUPPORTED_PROVIDER_IDS.filter((provider) =>
      isProviderConfigured(provider, config)
    );
  }

  function select({
    task = "conversation",
    preferredProvider,
    allowedProviders,
    capability,
    requiredCapabilities = capability ? [capability] : [],
    allowedModels
  } = {}) {
    if (!SUPPORTED_TASKS.includes(task)) {
      throw new Error(`Unsupported task "${task}".`);
    }

    if (
      allowedProviders !== undefined &&
      (!Array.isArray(allowedProviders) ||
        allowedProviders.some((provider) => !SUPPORTED_PROVIDER_IDS.includes(provider)))
    ) {
      throw new Error("allowedProviders must contain supported provider identifiers.");
    }

    if (
      preferredProvider !== undefined &&
      !SUPPORTED_PROVIDER_IDS.includes(preferredProvider)
    ) {
      throw new Error(`Unsupported preferred provider "${preferredProvider}".`);
    }

    let candidates = getCandidates();
    if (!Array.isArray(requiredCapabilities) ||
      requiredCapabilities.some((required) => !SUPPORTED_CAPABILITIES.includes(required))) {
      throw new Error("requiredCapabilities must contain supported capability identifiers.");
    }
    if (capability !== undefined && !SUPPORTED_CAPABILITIES.includes(capability)) {
      throw new Error("capability must be a supported capability identifier.");
    }
    if (allowedModels !== undefined &&
      (!Array.isArray(allowedModels) ||
        allowedModels.some((model) => typeof model !== "string" || !model.trim()))) {
      throw new Error("allowedModels must be an array of non-empty model identifiers.");
    }

    if (requiredCapabilities.length) {
      candidates = candidates.filter((provider) =>
        requiredCapabilities.every((required) =>
          supportsCapability(provider, required)
        )
      );
    }
    if (allowedProviders) {
      candidates = candidates.filter((provider) => allowedProviders.includes(provider));
    }
    if (allowedModels) {
      candidates = candidates.filter((provider) =>
        allowedModels.includes(getProviderOptions(provider, config).model)
      );
    }

    const globalPreferences = config.providerPreference || [];
    const taskPreferences = config.taskProviderPreferences?.[task] || [];
    if (
      !Array.isArray(globalPreferences) ||
      globalPreferences.some((provider) => !SUPPORTED_PROVIDER_IDS.includes(provider)) ||
      !Array.isArray(taskPreferences) ||
      taskPreferences.some((provider) => !SUPPORTED_PROVIDER_IDS.includes(provider))
    ) {
      throw new Error("Provider preferences must contain supported provider identifiers.");
    }

    const requestedPreference =
      preferredProvider ||
      [...taskPreferences, ...globalPreferences].find((provider) =>
        candidates.includes(provider)
      );

    if (requestedPreference) {
      if (!candidates.includes(requestedPreference)) {
        throw new Error(
          `Preferred provider "${requestedPreference}" is unavailable or not allowed for this configuration.`
        );
      }
      candidates = [
        requestedPreference,
        ...candidates.filter((provider) => provider !== requestedPreference)
      ];
    }

    const provider = candidates[0];
    if (!provider) {
      throw new Error("No configured AI provider is available for this request.");
    }

    const model = getProviderOptions(provider, config).model;
    return {
      provider,
      model,
      task,
      reason: requestedPreference
        ? `Selected the configured preferred provider for ${task}.`
        : requiredCapabilities.length
          ? `Selected the first configured provider whose adapter reports ${requiredCapabilities.join(", ")}; model support should be verified with the provider.`
          : `Selected the first configured provider for ${task}; no unverified capability or price ranking was applied.`,
      candidates: [...candidates],
      ...(capability ? { capability } : {}),
      ...(requiredCapabilities.length ? { requiredCapabilities: [...requiredCapabilities] } : {})
    };
  }

  return { select, getCandidates, getConfiguredProviders };
}
