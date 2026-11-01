import { defaultConfig } from "./config.js";
import { createProviderManager } from "../providers/provider-manager.js";
import { createWeydii } from "../somali/weydii.js";
import { createOpenAIProvider } from "../providers/openai-provider.js";
import { createGeminiProvider } from "../providers/gemini-provider.js";
import { createAnthropicProvider } from "../providers/anthropic-provider.js";
import { createMistralProvider } from "../providers/mistral-provider.js";
import { createDeepSeekProvider } from "../providers/deepseek-provider.js";
import { createCohereProvider } from "../providers/cohere-provider.js";
import { createXAIProvider } from "../providers/xai-provider.js";
import { createTextOperations, createConversation } from "../somali/operations.js";
import { ogaawLuqad as detectLanguage } from "../somali/language-detection.js";
import { caadiyeQoraal as normalizeText } from "../somali/normalize.js";
import {
  chunkDocuments,
  retrieveRelevantChunks
} from "../somali/knowledge.js";
import {
  createModelSelector,
  getProviderOptions,
  SUPPORTED_TASKS
} from "./model-selector.js";
import { createUsageTracker } from "./usage-tracker.js";
import {
  getAdapterCapabilities,
  getCapabilityMethod,
  SUPPORTED_CAPABILITIES
} from "./capabilities.js";
import { validateJsonSchema } from "../utils/validate-json-schema.js";

const providerFactories = {
  openai: createOpenAIProvider,
  gemini: createGeminiProvider,
  anthropic: createAnthropicProvider,
  mistral: createMistralProvider,
  deepseek: createDeepSeekProvider,
  cohere: createCohereProvider,
  xai: createXAIProvider
};

const taskByMethod = {
  weydii: "conversation",
  wadaSheekeysi: "conversation",
  siiWad: "conversation",
  turjun: "translation",
  sooKoob: "summarization",
  sharax: "reasoning",
  sax: "writing",
  dibUqor: "writing",
  hagaaji: "writing",
  balaadhi: "writing",
  qor: "writing",
  curi: "writing",
  fikrado: "writing",
  cinwaan: "writing",
  sameeSuaalo: "reasoning",
  falanqee: "reasoning",
  kalaSaar: "classification",
  dareen: "classification",
  sooSaarXog: "reasoning",
  isbarbarDhig: "reasoning",
  qorCode: "coding",
  sharaxCode: "coding",
  saxCode: "coding",
  dibUhabeeCode: "coding"
};

export function createSomaliAI(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Configuration options must be an object.");
  }

  if (
    options.apiKey !== undefined &&
    options.apiKey !== null &&
    (typeof options.apiKey !== "string" || !options.apiKey.trim())
  ) {
    throw new Error("API key must be a non-empty string.");
  }

  if (
    options.systemPrompt !== undefined &&
    options.systemPrompt !== null &&
    (typeof options.systemPrompt !== "string" || !options.systemPrompt.trim())
  ) {
    throw new Error("systemPrompt must be a non-empty string.");
  }

  if (options.mode !== undefined && !["manual", "auto"].includes(options.mode)) {
    throw new Error('mode must be either "manual" or "auto".');
  }

  if (
    options.providers !== undefined &&
    (options.providers === null ||
      typeof options.providers !== "object" ||
      Array.isArray(options.providers))
  ) {
    throw new Error("providers must be an object keyed by provider identifier.");
  }

  if (
    options.providerPreference !== undefined &&
    (!Array.isArray(options.providerPreference) ||
      options.providerPreference.some((provider) => !providerFactories[provider]))
  ) {
    throw new Error(
      "providerPreference must be an array of supported provider identifiers."
    );
  }

  if (options.taskProviderPreferences !== undefined) {
    if (
      options.taskProviderPreferences === null ||
      typeof options.taskProviderPreferences !== "object" ||
      Array.isArray(options.taskProviderPreferences)
    ) {
      throw new Error("taskProviderPreferences must be an object keyed by task.");
    }

    for (const [task, preferences] of Object.entries(options.taskProviderPreferences)) {
      if (!SUPPORTED_TASKS.includes(task)) {
        throw new Error(`Unsupported provider preference task "${task}".`);
      }
      if (
        !Array.isArray(preferences) ||
        preferences.some((provider) => !providerFactories[provider])
      ) {
        throw new Error(
          `Provider preferences for "${task}" must be an array of supported identifiers.`
        );
      }
    }
  }

  if (options.providers) {
    for (const [name, providerOptions] of Object.entries(options.providers)) {
      if (!providerFactories[name]) {
        throw new Error(`Provider "${name}" is not supported.`);
      }
      if (
        providerOptions === null ||
        typeof providerOptions !== "object" ||
        Array.isArray(providerOptions)
      ) {
        throw new Error(`Configuration for provider "${name}" must be an object.`);
      }
      if (
        providerOptions.apiKey !== undefined &&
        providerOptions.apiKey !== null &&
        (typeof providerOptions.apiKey !== "string" ||
          !providerOptions.apiKey.trim())
      ) {
        throw new Error(`${name} API key must be a non-empty string.`);
      }
      if (
        providerOptions.model !== undefined &&
        (typeof providerOptions.model !== "string" ||
          !providerOptions.model.trim())
      ) {
        throw new Error(`Model for provider "${name}" must be a non-empty string.`);
      }
      if (
        providerOptions.capabilities !== undefined &&
        (!Array.isArray(providerOptions.capabilities) ||
          providerOptions.capabilities.some(
            (capability) => !SUPPORTED_CAPABILITIES.includes(capability)
          ))
      ) {
        throw new Error(
          `Capabilities for provider "${name}" must be supported capability identifiers.`
        );
      }
    }
  }

  const config = {
    ...defaultConfig,
    ...options
  };

  const providerManager = createProviderManager();
  const conversationHistories = new Map();
  const modelSelector = createModelSelector(config, (providerName, capability) => {
    return getAdapterCapabilities(
      getProvider(providerName),
      config.providers?.[providerName]?.capabilities
    ).includes(capability);
  });
  const usageTracker = createUsageTracker(config.pricing || {});
  const trackedProviders = new WeakMap();

  function registerProvider(name, provider) {
    providerManager.register(name, provider);
  }

  function getProvider(name) {
    if (providerManager.list().includes(name)) {
      return providerManager.get(name);
    }

    const createProvider = providerFactories[name];
    if (createProvider) {
      const providerOptions = getProviderOptions(name, config);
      if (name !== "gemini") {
        providerOptions.apiKey = providerOptions.apiKey || config.apiKey;
        providerOptions.model = providerOptions.model || config.model;
      }
      const provider = createProvider(providerOptions);

      providerManager.register(name, provider);

      return provider;
    }

    throw new Error(`Provider "${name}" is not supported.`);
  }

  function resolveProviderName(provider, task) {
    if (config.mode === "auto") {
      if (provider) {
        const configured = modelSelector.getCandidates();
        if (!configured.includes(provider)) {
          throw new Error(
            `Provider "${provider}" is not configured for automatic mode.`
          );
        }
        return provider;
      }
      return modelSelector.select({ task }).provider;
    }

    return provider || config.provider || "gemini";
  }

  function getTrackedProvider(providerName) {
    const provider = getProvider(providerName);
    if (trackedProviders.has(provider)) {
      return trackedProviders.get(provider);
    }

    const model = provider.model || getProviderOptions(providerName, config).model || config.model;
    const tracked = {
      generate: async (request) => {
        const tracking = usageTracker.start(providerName, model);
        try {
          const response = await provider.generate(request);
          usageTracker.finish(tracking, response);
          return response;
        } catch (error) {
          usageTracker.fail(tracking);
          throw error;
        }
      }
    };

    if (typeof provider.stream === "function") {
      tracked.stream = async function* (request) {
        const tracking = usageTracker.start(providerName, model);
        let completed = false;
        let recorded = false;
        let usage;
        try {
          for await (const chunk of provider.stream(request)) {
            if (chunk?.usage) {
              usage = chunk.usage;
            }
            yield chunk;
          }
          completed = true;
          usageTracker.finish(tracking, { usage });
          recorded = true;
        } catch (error) {
          usageTracker.fail(tracking);
          recorded = true;
          throw error;
        } finally {
          if (!completed && !recorded) {
            usageTracker.fail(tracking);
          }
        }
      };
    }

    const optionalMethods = new Set(
      SUPPORTED_CAPABILITIES
        .map(getCapabilityMethod)
        .filter((method) => method && !["generate", "stream"].includes(method))
    );
    for (const method of optionalMethods) {
      if (typeof provider[method] !== "function") {
        continue;
      }
      tracked[method] = async (...args) => {
        const requestModel = args[0]?.model || model;
        const tracking = usageTracker.start(providerName, requestModel);
        try {
          const response = await provider[method](...args);
          usageTracker.finish(tracking, response);
          return response;
        } catch (error) {
          usageTracker.fail(tracking);
          throw error;
        }
      };
    }

    trackedProviders.set(provider, tracked);
    return tracked;
  }

  async function weydii(question, options = {}) {
    if (
      question &&
      typeof question === "object" &&
      !Array.isArray(question)
    ) {
      question = question["su'aal"] ?? question.question;
    }

    const providerName = resolveProviderName(options.provider, "conversation");
    const provider = getTrackedProvider(providerName);
    return createWeydii(provider, config.systemPrompt)(question, options);
  }

  function getConversation(providerName) {
    if (!conversationHistories.has(providerName)) {
      conversationHistories.set(providerName, []);
    }

    return createConversation(
      getTrackedProvider(providerName),
      conversationHistories.get(providerName),
      config.language,
      config.systemPrompt
    );
  }

  function withProvider(operationName, method) {
    return async (...args) => {
      const options = args[args.length - 1];
      const explicitProvider =
        options && !Array.isArray(options) && typeof options === "object"
          ? options.provider
          : undefined;
      const providerName = resolveProviderName(
        explicitProvider,
        taskByMethod[operationName] || "conversation"
      );

      const provider = getTrackedProvider(providerName);
      return method(
        createTextOperations(provider, config.language, config.systemPrompt),
        args
      );
    };
  }

  const textMethods = {
    turjun: withProvider("turjun", (operations, args) => operations.turjun(...args)),
    sooKoob: withProvider("sooKoob", (operations, args) => operations.sooKoob(...args)),
    sharax: withProvider("sharax", (operations, args) => operations.sharax(...args)),
    sax: withProvider("sax", (operations, args) => operations.sax(...args)),
    dibUqor: withProvider("dibUqor", (operations, args) => operations.dibUqor(...args)),
    hagaaji: withProvider("hagaaji", (operations, args) => operations.hagaaji(...args)),
    balaadhi: withProvider("balaadhi", (operations, args) => operations.balaadhi(...args)),
    qor: withProvider("qor", (operations, args) => operations.qor(...args)),
    curi: withProvider("curi", (operations, args) => operations.curi(...args)),
    fikrado: withProvider("fikrado", (operations, args) => operations.fikrado(...args)),
    cinwaan: withProvider("cinwaan", (operations, args) => operations.cinwaan(...args)),
    sameeSuaalo: withProvider("sameeSuaalo", (operations, args) => operations.sameeSuaalo(...args)),
    falanqee: withProvider("falanqee", (operations, args) => operations.falanqee(...args)),
    kalaSaar: withProvider("kalaSaar", (operations, args) => operations.kalaSaar(...args)),
    dareen: withProvider("dareen", (operations, args) => operations.dareen(...args)),
    sooSaarXog: withProvider("sooSaarXog", (operations, args) => operations.sooSaarXog(...args)),
    isbarbarDhig: withProvider("isbarbarDhig", (operations, args) => operations.isbarbarDhig(...args)),
    qorCode: withProvider("qorCode", (operations, args) => operations.qorCode(...args)),
    sharaxCode: withProvider("sharaxCode", (operations, args) => operations.sharaxCode(...args)),
    saxCode: withProvider("saxCode", (operations, args) => operations.saxCode(...args)),
    dibUhabeeCode: withProvider("dibUhabeeCode", (operations, args) => operations.dibUhabeeCode(...args))
  };

  async function wadaSheekeysi(message, options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new Error("Options must be an object.");
    }

    const providerName = resolveProviderName(options.provider, "conversation");

    return getConversation(providerName).wadaSheekeysi(message, options);
  }

  async function siiWad(message, options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new Error("Options must be an object.");
    }

    const providerName = resolveProviderName(options.provider, "conversation");

    return getConversation(providerName).siiWad(message, options);
  }

  function nadiifi(options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new Error("Options must be an object.");
    }

    if (options.provider) {
      conversationHistories.delete(options.provider);
    } else {
      conversationHistories.clear();
    }

    return true;
  }

  function getConfig() {
    return {
      language: config.language,
      provider: config.provider,
      model: config.model,
      systemPrompt: config.systemPrompt,
      mode: config.mode || "manual",
      ...(config.providerPreference !== undefined
        ? { providerPreference: [...config.providerPreference] }
        : {}),
      ...(config.taskProviderPreferences !== undefined
        ? {
            taskProviderPreferences: Object.fromEntries(
              Object.entries(config.taskProviderPreferences).map(([task, providers]) => [
                task,
                [...providers]
              ])
            )
          }
        : {}),
      ...(config.mode === "auto"
        ? { configuredProviders: modelSelector.getCandidates() }
        : {})
    };
  }

  function getProviders() {
    return providerManager.list();
  }

  function doorModel(options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new Error("doorModel options must be an object.");
    }
    return modelSelector.select(options);
  }

  function ogaawLuqad(input) {
    const text = typeof input === "string" ? input : input?.text;
    return detectLanguage(text);
  }

  function caadiyeQoraal(input) {
    const text = typeof input === "string" ? input : input?.text;
    return normalizeText(text);
  }

  function getConfiguredProviderNames() {
    return [...new Set([
      ...modelSelector.getCandidates().filter((name) => providerFactories[name]),
      ...Object.keys(config.providers || {}).filter((name) => providerFactories[name]),
      ...providerManager.list()
    ])];
  }

  function awoodahaModelka(options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new Error("awoodahaModelka expects an options object.");
    }

    const names = options.provider
      ? [options.provider]
      : getConfiguredProviderNames();
    if (options.provider && !providerFactories[options.provider] &&
      !providerManager.list().includes(options.provider)) {
      throw new Error(`Provider "${options.provider}" is not supported.`);
    }

    if (options.model !== undefined &&
      (typeof options.model !== "string" || !options.model.trim())) {
      throw new Error("model must be a non-empty model identifier string.");
    }

    const providers = names.map((name) => {
      const providerOptions = config.providers?.[name] || {};
      const model = providerOptions.model ||
        (name === config.provider || (!config.provider && name === "gemini")
          ? config.model
          : null) ||
        (name === "gemini" ? "gemini-2.5-flash" : null) ||
        (providerManager.list().includes(name)
          ? providerManager.get(name).model
          : null) ||
        null;
      const isConfigured = modelSelector.getCandidates().includes(name) ||
        providerManager.list().includes(name);
      const adapter = providerManager.list().includes(name)
        ? providerManager.get(name)
        : isConfigured
          ? getProvider(name)
          : null;
      const capabilities = getAdapterCapabilities(
        adapter,
        providerOptions.capabilities
      );
      const requestedModelMatches = options.model === undefined || options.model === model;

      return {
        provider: name,
        model: options.model || model,
        configured: isConfigured && requestedModelMatches,
        capabilities: isConfigured && requestedModelMatches ? capabilities : [],
        unsupportedCapabilities: SUPPORTED_CAPABILITIES.filter(
          (capability) => !capabilities.includes(capability)
        ),
        capabilitySource: providerOptions.capabilities
          ? "adapter-and-developer-configuration"
          : Array.isArray(adapter?.capabilities)
            ? "adapter-declaration"
            : "baseline-adapter-interface",
        modelCapabilityVerification:
          "Adapter support is reported; actual model capability and account access must be verified with the provider."
      };
    });

    return {
      defaultProvider: config.provider || "gemini",
      defaultModel: config.model || (config.provider && config.provider !== "gemini"
        ? null
        : "gemini-2.5-flash"),
      providers,
      unsupportedCapabilities: SUPPORTED_CAPABILITIES.filter(
        (capability) => !providers.some((entry) => entry.capabilities.includes(capability))
      )
    };
  }

  function invokeCapability(capability, input, task) {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new Error(`${capability} operation expects an options object.`);
    }
    const providerName = resolveProviderName(input.provider, task);
    const provider = getProvider(providerName);
    const configuredCapabilities = config.providers?.[providerName]?.capabilities;
    const method = getCapabilityMethod(capability);
    const capabilities = getAdapterCapabilities(provider, configuredCapabilities);
    if (!capabilities.includes(capability)) {
      throw new Error(
        `Provider "${providerName}" does not implement the "${capability}" capability.`
      );
    }

    return getTrackedProvider(providerName)[method]({
      ...input,
      provider: providerName,
      model: input.embeddingModel || input.model ||
        provider.model || getProviderOptions(providerName, config).model,
      language: input.language || config.language,
      systemPrompt: config.systemPrompt
    });
  }

  function operationMetadata(input, task, result = {}) {
    const providerName = resolveProviderName(input.provider, task);
    const provider = getProvider(providerName);
    return {
      provider: result.provider || providerName,
      model: result.model || provider.model ||
        getProviderOptions(providerName, config).model || null
    };
  }

  function validateMediaPayload(value, name, mimeType) {
    if (
      typeof value !== "string" &&
      !(value instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(value) &&
      !(typeof Blob !== "undefined" && value instanceof Blob)
    ) {
      throw new Error(`${name} must be a string, Blob, ArrayBuffer, or typed array.`);
    }
    const dataUriMimeType = typeof value === "string"
      ? value.match(/^data:([^;,]+)[;,]/i)?.[1]
      : undefined;
    const resolvedMimeType = mimeType ||
      (typeof Blob !== "undefined" && value instanceof Blob ? value.type : null) ||
      dataUriMimeType ||
      (name === "document" && typeof value === "string" ? "text/plain" : null);
    if (!resolvedMimeType ||
      !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(resolvedMimeType)) {
      throw new Error(`${name} requires a valid MIME type.`);
    }
    if (name === "audio" && !resolvedMimeType.toLowerCase().startsWith("audio/")) {
      throw new Error("audio must use an audio MIME type.");
    }
    if (name === "image" && !resolvedMimeType.toLowerCase().startsWith("image/")) {
      throw new Error("image must use an image MIME type.");
    }
    if (name === "document" &&
      !resolvedMimeType.toLowerCase().startsWith("text/") &&
      ![
        "application/pdf",
        "application/rtf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ].includes(resolvedMimeType.toLowerCase())) {
      throw new Error(`Unsupported document MIME type "${resolvedMimeType}".`);
    }
    const byteLength = typeof value === "string"
      ? new TextEncoder().encode(value).byteLength
      : value instanceof ArrayBuffer
        ? value.byteLength
        : ArrayBuffer.isView(value)
          ? value.byteLength
          : value.size;
    if (byteLength > 25 * 1024 * 1024) {
      throw new Error(`${name} exceeds the 25 MB SDK request limit.`);
    }
  }

  function ogaawLahjad(input = {}) {
    if (typeof input === "string") {
      input = { text: input };
    }
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("ogaawLahjad expects text or an options object.");
    }
    if (typeof input.text !== "string" || !input.text.trim()) {
      throw new Error("Please provide non-empty text for dialect detection.");
    }

    const providerName = input.provider || config.provider || "gemini";
    if (providerManager.list().includes(providerName) &&
      getAdapterCapabilities(
        providerManager.get(providerName),
        config.providers?.[providerName]?.capabilities
      ).includes("dialect-detection")) {
      return providerManager.get(providerName).detectDialect({
        text: input.text,
        language: input.language || config.language
      });
    }
    return {
      dialect: "unknown",
      confidence: null,
      reliable: false,
      method: "unsupported",
      reason: "No configured provider adapter offers verified Somali dialect detection."
    };
  }

  async function hadalUqor(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("hadalUqor expects an options object.");
    }
    if (input.audio === undefined || input.audio === null) {
      throw new Error("Please provide audio to transcribe.");
    }
    validateMediaPayload(input.audio, "audio", input.mimeType);
    const result = await invokeCapability("speech-recognition", input, "conversation");
    if (typeof result?.text !== "string" || !result.text.trim()) {
      throw new Error("Speech adapter returned no transcription text.");
    }
    return {
      ...result,
      ...operationMetadata(input, "conversation", result)
    };
  }

  async function qoraalUhadal(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("qoraalUhadal expects an options object.");
    }
    if (typeof input.text !== "string" || !input.text.trim()) {
      throw new Error("Please provide non-empty text for speech synthesis.");
    }
    const result = await invokeCapability("text-to-speech", input, "conversation");
    const audio = result?.audio ?? result?.data ?? result;
    if (audio === undefined || audio === null || audio === "") {
      throw new Error("Speech synthesis adapter returned no audio output.");
    }
    return {
      ...(result && typeof result === "object" && !ArrayBuffer.isView(result)
        ? result
        : {}),
      audio,
      ...operationMetadata(input, "conversation", result)
    };
  }

  async function falanqeeSawir(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("falanqeeSawir expects an options object.");
    }
    if (input.image === undefined || input.image === null) {
      throw new Error("Please provide an image to analyze.");
    }
    validateMediaPayload(input.image, "image", input.mimeType);
    if (typeof input.prompt !== "string" || !input.prompt.trim()) {
      throw new Error("Please provide a non-empty image analysis prompt.");
    }
    const result = await invokeCapability("image-understanding", input, "reasoning");
    if (typeof result?.text !== "string" || !result.text.trim()) {
      throw new Error("Image analysis adapter returned no text result.");
    }
    return {
      ...result,
      ...operationMetadata(input, "reasoning", result)
    };
  }

  async function falanqeeDukumenti(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("falanqeeDukumenti expects an options object.");
    }
    if (input.document === undefined || input.document === null) {
      throw new Error("Please provide a document to analyze.");
    }
    validateMediaPayload(input.document, "document", input.mimeType);
    if (typeof input.prompt !== "string" || !input.prompt.trim()) {
      throw new Error("Please provide a non-empty document analysis prompt.");
    }
    const result = await invokeCapability("document-understanding", input, "reasoning");
    if (typeof result?.text !== "string" || !result.text.trim()) {
      throw new Error("Document analysis adapter returned no text result.");
    }
    return {
      ...result,
      ...operationMetadata(input, "reasoning", result)
    };
  }

  async function sameeSawir(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("sameeSawir expects an options object.");
    }
    if (typeof input.prompt !== "string" || !input.prompt.trim()) {
      throw new Error("Please provide a non-empty image generation prompt.");
    }
    const result = await invokeCapability("image-generation", input, "writing");
    let images = result?.images;
    if (!Array.isArray(images)) {
      const singleImage = result?.image ?? result?.url ?? result?.data;
      images = singleImage === undefined ? [] : [singleImage];
    }
    if (images.length === 0 || images.some((image) =>
      typeof image !== "string" &&
      (!image || typeof image !== "object" ||
        (image.url === undefined && image.data === undefined))
    )) {
      throw new Error("Image generation adapter returned no usable image output.");
    }
    return {
      ...result,
      images,
      ...operationMetadata(input, "writing", result)
    };
  }

  async function sameeMuuqaal(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("sameeMuuqaal expects an options object.");
    }
    if (typeof input.prompt !== "string" || !input.prompt.trim()) {
      throw new Error("Please provide a non-empty video generation prompt.");
    }
    const job = await invokeCapability("video-generation", input, "writing");
    if (!job || typeof job.id !== "string" ||
      !["queued", "processing", "completed", "failed", "cancelled"].includes(job.status)) {
      throw new Error(
        'Video adapters must return a job with an id and a supported status.'
      );
    }
    return {
      ...job,
      ...operationMetadata(input, "writing", job)
    };
  }

  async function hubiMuuqaal(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
      typeof input.id !== "string" || !input.id.trim()) {
      throw new Error("hubiMuuqaal expects a non-empty job id and options object.");
    }
    const job = await invokeCapability("video-job-status", input, "reasoning");
    if (!job || job.id !== input.id ||
      !["queued", "processing", "completed", "failed", "cancelled"].includes(job.status)) {
      throw new Error("Video status adapters must return the requested job id and a supported status.");
    }
    return {
      ...job,
      ...operationMetadata(input, "reasoning", job)
    };
  }

  async function helMuuqaal(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
      typeof input.id !== "string" || !input.id.trim()) {
      throw new Error("helMuuqaal expects a non-empty completed video job id.");
    }
    const result = await invokeCapability("video-retrieval", input, "reasoning");
    if (result?.status && result.status !== "completed") {
      throw new Error("Video output is not available until the job is completed.");
    }
    if (result?.video === undefined && result?.url === undefined &&
      result?.data === undefined && !(result instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(result) &&
      !(typeof Blob !== "undefined" && result instanceof Blob)) {
      throw new Error("Video retrieval adapter returned no video output.");
    }
    return {
      ...(result && typeof result === "object" &&
        !(result instanceof ArrayBuffer) && !ArrayBuffer.isView(result) &&
        !(typeof Blob !== "undefined" && result instanceof Blob)
        ? result
        : { video: result }),
      ...operationMetadata(input, "reasoning", result)
    };
  }

  async function joojiMuuqaal(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
      typeof input.id !== "string" || !input.id.trim()) {
      throw new Error("joojiMuuqaal expects a non-empty video job id.");
    }
    return invokeCapability("video-cancellation", input, "reasoning");
  }

  async function sooSaarJSON(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("sooSaarJSON expects an options object.");
    }
    if (typeof input.prompt !== "string" || !input.prompt.trim()) {
      throw new Error("Please provide a non-empty JSON extraction prompt.");
    }
    if (!input.schema || typeof input.schema !== "object" || Array.isArray(input.schema)) {
      throw new Error("schema must be a JSON Schema object.");
    }

    const response = await invokeCapability(
      "structured-output",
      input,
      "reasoning"
    );
    let data = response?.data ?? response?.output ?? response?.text;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        throw new Error("Provider returned invalid JSON for structured output.");
      }
    }
    const validationErrors = validateJsonSchema(data, input.schema);
    if (validationErrors.length) {
      throw new Error(`Structured output failed schema validation: ${validationErrors.join(" ")}`);
    }

    return {
      data,
      ...operationMetadata(input, "reasoning", response),
      ...(response.usage ? { usage: response.usage } : {})
    };
  }

  async function sameeEmbedding(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("sameeEmbedding expects an options object.");
    }
    const texts = typeof input.text === "string"
      ? [input.text]
      : input.texts;
    if (!Array.isArray(texts) || texts.length === 0 ||
      texts.some((text) => typeof text !== "string" || !text.trim())) {
      throw new Error("Provide non-empty text or a non-empty array of texts.");
    }
    const response = await invokeCapability(
      "embeddings",
      { ...input, texts },
      "reasoning"
    );
    const embeddings = response?.embeddings ||
      (response?.embedding ? [response.embedding] : null);
    if (!Array.isArray(embeddings) || embeddings.length !== texts.length ||
      embeddings.some((vector) => !Array.isArray(vector) ||
        vector.length === 0 || vector.some((value) => !Number.isFinite(value)))) {
      throw new Error("Embedding adapter returned invalid or mismatched vectors.");
    }
    const dimensions = embeddings[0].length;
    if (embeddings.some((vector) => vector.length !== dimensions)) {
      throw new Error("Embedding adapter returned incompatible vector dimensions.");
    }
    return {
      embeddings,
      ...operationMetadata(input, "reasoning", response),
      ...(response.usage ? { usage: response.usage } : {})
    };
  }

  function isuEegEmbedding(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) ||
      left.length === 0 || left.length !== right.length ||
      left.some((value) => !Number.isFinite(value)) ||
      right.some((value) => !Number.isFinite(value))) {
      throw new Error("Embedding vectors must be non-empty numeric arrays with matching dimensions.");
    }
    const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value ** 2, 0));
    const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value ** 2, 0));
    if (leftNorm === 0 || rightNorm === 0) {
      throw new Error("Embedding vectors must have non-zero magnitudes.");
    }
    return left.reduce((sum, value, index) => sum + value * right[index], 0) /
      (leftNorm * rightNorm);
  }

  async function wakiilAI(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("wakiilAI expects an options object.");
    }
    if (typeof input.task !== "string" || !input.task.trim()) {
      throw new Error("Please provide a non-empty agent task.");
    }
    const maxSteps = input.maxSteps ?? 5;
    if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 10) {
      throw new Error("maxSteps must be an integer from 1 to 10.");
    }
    const maxExecutionMs = input.maxExecutionMs ?? 30000;
    if (!Number.isInteger(maxExecutionMs) ||
      maxExecutionMs < 1 || maxExecutionMs > 120000) {
      throw new Error("maxExecutionMs must be an integer from 1 to 120000.");
    }
    if (input.tools !== undefined && !Array.isArray(input.tools)) {
      throw new Error("tools must be an array of explicitly supplied tool definitions.");
    }
    if (input.signal !== undefined &&
      (!input.signal || typeof input.signal.aborted !== "boolean" ||
        typeof input.signal.addEventListener !== "function")) {
      throw new Error("signal must be an AbortSignal.");
    }
    if (input.approve !== undefined && typeof input.approve !== "function") {
      throw new Error("approve must be a function when provided.");
    }
    if (input.memory !== undefined && !Array.isArray(input.memory)) {
      throw new Error("memory must be an array of prior JSON-compatible agent steps.");
    }
    const tools = input.tools || [];
    const names = new Set();
    for (const tool of tools) {
      if (!tool || typeof tool !== "object" ||
        typeof tool.name !== "string" || !/^[a-zA-Z][\w-]{0,63}$/.test(tool.name) ||
        typeof tool.execute !== "function" ||
        !tool.schema || typeof tool.schema !== "object" ||
        (tool.requiresApproval !== undefined &&
          typeof tool.requiresApproval !== "boolean") ||
        names.has(tool.name)) {
        throw new Error("Each tool needs a unique name, JSON schema, and execute function.");
      }
      names.add(tool.name);
    }
    const providerName = resolveProviderName(input.provider, "reasoning");
    const provider = getProvider(providerName);
    if (typeof provider.generateWithTools !== "function") {
      throw new Error(
        `Provider "${providerName}" does not implement the "tool-calling" capability.`
      );
    }
    let history = [];
    if (input.memory !== undefined) {
      let serializedMemory;
      try {
        serializedMemory = JSON.stringify(input.memory);
      } catch {
        throw new Error("memory must contain only JSON-compatible values.");
      }
      if (serializedMemory.length > 1024 * 1024) {
        throw new Error("memory must be smaller than 1 MB.");
      }
      history = JSON.parse(serializedMemory);
    }
    const executionHistory = [];
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (input.signal?.aborted) {
      onAbort();
    } else {
      input.signal?.addEventListener("abort", onAbort, { once: true });
    }
    const deadline = Date.now() + maxExecutionMs;
    const timeout = setTimeout(() => controller.abort(), maxExecutionMs);
    async function withinDeadline(operation) {
      const remaining = deadline - Date.now();
      if (remaining <= 0 || controller.signal.aborted) {
        const timedOut = Date.now() >= deadline;
        const error = new Error(
          timedOut
            ? "Agent execution exceeded maxExecutionMs."
            : "Agent execution was cancelled."
        );
        error.name = timedOut ? "TimeoutError" : "AbortError";
        throw error;
      }
      let timeoutHandle;
      let abortListener;
      try {
        return await Promise.race([
          operation,
          new Promise((_, reject) => {
            abortListener = () => {
              const error = new Error("Agent execution was cancelled.");
              error.name = "AbortError";
              reject(error);
            };
            controller.signal.addEventListener("abort", abortListener, { once: true });
          }),
          new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
              controller.abort();
              const error = new Error("Agent execution exceeded maxExecutionMs.");
              error.name = "TimeoutError";
              reject(error);
            }, remaining);
          })
        ]);
      } finally {
        clearTimeout(timeoutHandle);
        if (abortListener) {
          controller.signal.removeEventListener("abort", abortListener);
        }
      }
    }

    try {
      for (let step = 0; step < maxSteps; step += 1) {
        if (controller.signal.aborted) {
          const error = new Error("Agent execution was cancelled.");
          error.name = "AbortError";
          throw error;
        }
        const result = await withinDeadline(
          getTrackedProvider(providerName).generateWithTools({
            task: input.task,
            tools: tools.map(({ name, description, schema }) => ({
              name,
              description,
              schema
            })),
            history,
            step: step + 1,
            language: input.language || config.language,
            systemPrompt: config.systemPrompt,
            signal: controller.signal
          })
        );
        if (typeof result?.finalAnswer === "string") {
          return {
            answer: result.finalAnswer,
            steps: step + 1,
            executionHistory,
            ...(input.memory !== undefined ? { memory: history } : {}),
            provider: result.provider || providerName,
            model: result.model || provider.model || config.model
          };
        }
        const call = result?.toolCall;
        const tool = tools.find((candidate) => candidate.name === call?.name);
        if (!tool) {
          throw new Error("Agent requested a tool that was not explicitly provided.");
        }
        const validationErrors = validateJsonSchema(call.arguments, tool.schema);
        if (validationErrors.length) {
          throw new Error(`Agent tool arguments are invalid: ${validationErrors.join(" ")}`);
        }
        if (tool.requiresApproval) {
          if (typeof input.approve !== "function") {
            return {
              status: "approval_required",
              pendingTool: { name: tool.name, arguments: call.arguments },
              steps: step + 1,
              executionHistory,
              ...(input.memory !== undefined ? { memory: history } : {})
            };
          }
          const approved = await withinDeadline(
            input.approve({
              name: tool.name,
              arguments: call.arguments,
              signal: controller.signal
            })
          );
          if (!approved) {
            executionHistory.push({ tool: tool.name, status: "denied" });
            history.push({ tool: tool.name, status: "denied" });
            continue;
          }
        }
        const toolResult = await withinDeadline(
          tool.execute(call.arguments, { signal: controller.signal })
        );
        let safeResult;
        try {
          safeResult = JSON.stringify(toolResult);
        } catch {
          throw new Error(`Tool "${tool.name}" returned a non-serializable result.`);
        }
        if (safeResult === undefined || safeResult.length > 1024 * 1024) {
          throw new Error(`Tool "${tool.name}" result must be JSON serializable and under 1 MB.`);
        }
        const serializedResult = JSON.parse(safeResult);
        executionHistory.push({ tool: tool.name, status: "completed" });
        history.push({
          tool: tool.name,
          arguments: call.arguments,
          result: serializedResult
        });
      }
      return {
        status: "max_steps_reached",
        steps: maxSteps,
        executionHistory,
        ...(input.memory !== undefined ? { memory: history } : {}),
        provider: providerName,
        model: provider.model || config.model
      };
    } finally {
      clearTimeout(timeout);
      input.signal?.removeEventListener("abort", onAbort);
    }
  }

  async function raadsoAqoon(input = {}) {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("raadsoAqoon expects an options object.");
    }
    if (typeof input.question !== "string" || !input.question.trim()) {
      throw new Error("Please provide a non-empty question.");
    }

    if (input.strategy !== undefined &&
      !["lexical", "semantic"].includes(input.strategy)) {
      throw new Error('strategy must be "lexical" or "semantic".');
    }
    if (input.vectorStore !== undefined &&
      (input.strategy !== "semantic" ||
        !input.vectorStore ||
        typeof input.vectorStore !== "object" ||
        typeof input.vectorStore.search !== "function")) {
      throw new Error(
        "vectorStore requires semantic strategy and a search(vector, options) function."
      );
    }
    if (input.indexDocuments !== undefined &&
      typeof input.indexDocuments !== "boolean") {
      throw new Error("indexDocuments must be a boolean.");
    }

    const chunks = chunkDocuments(input.documents, {
      chunkSize: input.chunkSize,
      overlap: input.overlap
    });
    let retrieved;
    let providerName;
    let provider;
    if (input.strategy === "semantic") {
      providerName = resolveProviderName(input.provider, "reasoning");
      provider = getTrackedProvider(providerName);
      if (typeof input.embeddingModel !== "string" || !input.embeddingModel.trim()) {
        throw new Error(
          "Semantic retrieval requires an explicit embeddingModel identifier."
        );
      }
      const rawProvider = getProvider(providerName);
      const configuredCapabilities = config.providers?.[providerName]?.capabilities;
      if (!getAdapterCapabilities(rawProvider, configuredCapabilities).includes("embeddings")) {
        throw new Error(
          `Provider "${providerName}" does not implement the "embeddings" capability.`
        );
      }
      const vectorsResult = await provider.createEmbedding({
        texts: [input.question, ...chunks.map((chunk) => chunk.text)],
        model: input.embeddingModel
      });
      const vectors = vectorsResult?.embeddings;
      if (!Array.isArray(vectors) || vectors.length !== chunks.length + 1 ||
        vectors.some((vector) => !Array.isArray(vector) || vector.length === 0 ||
          vector.some((value) => !Number.isFinite(value)))) {
        throw new Error("Embedding adapter returned invalid vectors for semantic retrieval.");
      }
      const dimensions = vectors[0].length;
      if (vectors.some((vector) => vector.length !== dimensions)) {
        throw new Error("Embedding vectors have incompatible dimensions.");
      }
      const cosineSimilarity = (left, right) => {
        const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
        const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value ** 2, 0));
        const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value ** 2, 0));
        if (leftNorm === 0 || rightNorm === 0) {
          throw new Error("Embedding vectors must have non-zero magnitudes.");
        }
        return dot / (leftNorm * rightNorm);
      };
      const minScore = input.minScore ?? 0;
      if (!Number.isFinite(minScore) || minScore < -1 || minScore > 1) {
        throw new Error("minScore must be a number from -1 to 1.");
      }
      const limit = input.limit ?? 4;
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Retrieval limit must be a positive integer.");
      }
      if (input.vectorStore) {
        const store = input.vectorStore;
        if (store.dimensions !== dimensions ||
          store.embeddingModel !== input.embeddingModel) {
          throw new Error(
            "Vector store embedding model and dimensions must match the configured embedding model."
          );
        }
        if (input.indexDocuments === true) {
          if (typeof store.upsert !== "function") {
            throw new Error("indexDocuments requires vectorStore.upsert(records, options).");
          }
          await store.upsert(
            chunks.map((chunk, index) => ({
              id: `${chunk.documentId}:${chunk.chunkIndex}`,
              vector: vectors[index + 1],
              text: chunk.text,
              metadata: {
                documentId: chunk.documentId,
                chunkIndex: chunk.chunkIndex
              }
            })),
            { embeddingModel: input.embeddingModel, dimensions }
          );
        }
        const hits = await store.search(vectors[0], {
          limit,
          embeddingModel: input.embeddingModel,
          dimensions
        });
        if (!Array.isArray(hits) || hits.some((hit) =>
          !hit || typeof hit !== "object" ||
          typeof hit.id !== "string" ||
          typeof hit.text !== "string" ||
          !Number.isFinite(hit.score)
        )) {
          throw new Error("Vector store returned malformed search results.");
        }
        retrieved = hits
          .filter((hit) => hit.score >= minScore)
          .slice(0, limit)
          .map((hit) => ({
            documentId: hit.metadata?.documentId || hit.documentId || hit.id,
            chunkIndex: Number.isInteger(hit.metadata?.chunkIndex)
              ? hit.metadata.chunkIndex
              : 0,
            text: hit.text,
            score: hit.score
          }));
      } else {
        retrieved = chunks
        .map((chunk, index) => ({
          ...chunk,
          score: cosineSimilarity(vectors[0], vectors[index + 1])
        }))
        .filter((chunk) => chunk.score >= minScore)
        .sort((left, right) =>
          right.score - left.score ||
          left.documentId.localeCompare(right.documentId) ||
          left.chunkIndex - right.chunkIndex
        )
        .slice(0, limit);
      }
    } else {
      retrieved = retrieveRelevantChunks(input.question, chunks, {
        limit: input.limit
      });
    }

    if (retrieved.length === 0) {
      const language = detectLanguage(input.question).language;
      return {
        answer: language === "en"
          ? "The provided documents do not contain enough information to answer this question."
          : "Dukumentiyada la bixiyay kuma jiraan xog ku filan oo su'aashan looga jawaabo.",
        sources: [],
        hasEnoughInformation: false,
        provider: null,
        model: null
      };
    }

    providerName ||= resolveProviderName(input.provider, "reasoning");
    provider ||= getTrackedProvider(providerName);
    const context = retrieved
      .map((chunk) => `[${chunk.documentId}]\n${chunk.text}`)
      .join("\n\n");
    const response = await provider.generate({
      prompt: `Answer the question using only the source passages below. If they do not contain the answer, say that the documents do not provide enough information. Do not invent facts or source IDs. Cite supporting document IDs in square brackets.\n\nSources:\n${context}\n\nQuestion:\n${input.question}`,
      language: input.language || config.language,
      systemPrompt: config.systemPrompt,
      operationInstructions:
        "Use only provided source passages. Never invent facts or citations."
    });

    return {
      answer: response.text,
      sources: retrieved.map((chunk) => ({
        id: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        excerpt: chunk.text,
        relevance: chunk.score
      })),
      hasEnoughInformation: true,
      provider: response.provider || providerName,
      model: response.model || provider.model || config.model || null
    };
  }

  async function* qulqul(input = {}) {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("qulqul expects an options object.");
    }
    if (typeof input.prompt !== "string" || !input.prompt.trim()) {
      throw new Error("Please provide a non-empty prompt to stream.");
    }
    if (
      input.signal !== undefined &&
      (!input.signal ||
        typeof input.signal.aborted !== "boolean" ||
        typeof input.signal.addEventListener !== "function")
    ) {
      throw new Error("signal must be an AbortSignal.");
    }

    const providerName = resolveProviderName(input.provider, "conversation");
    const provider = getTrackedProvider(providerName);
    if (typeof provider.stream !== "function") {
      throw new Error(`Streaming is not supported by provider "${providerName}".`);
    }

    for await (const chunk of provider.stream({
      prompt: input.prompt,
      language: input.language || config.language,
      systemPrompt: config.systemPrompt,
      operationInstructions: input.operationInstructions,
      signal: input.signal
    })) {
      yield chunk;
    }
  }

  function cabirIsticmaalka(options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new Error("Usage options must be an object.");
    }
    return usageTracker.snapshot({ reset: options.reset === true });
  }

  return {
    weydii,
    wadaSheekeysi,
    siiWad,
    nadiifi,
    doorModel,
    awoodahaModelka,
    raadsoAqoon,
    ogaawLuqad,
    ogaawLahjad,
    caadiyeQoraal,
    hadalUqor,
    qoraalUhadal,
    wakiilAI,
    falanqeeSawir,
    falanqeeDukumenti,
    sooSaarJSON,
    sameeEmbedding,
    isuEegEmbedding,
    sameeSawir,
    sameeMuuqaal,
    hubiMuuqaal,
    helMuuqaal,
    joojiMuuqaal,
    qulqul,
    cabirIsticmaalka,
    ...textMethods,
    getConfig,
    getProviders,
    providers: {
      register: registerProvider,
      get: getProvider,
      list: getProviders
    }
  };
}