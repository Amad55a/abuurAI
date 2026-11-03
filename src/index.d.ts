export type ProviderId =
  | "openai"
  | "gemini"
  | "anthropic"
  | "mistral"
  | "deepseek"
  | "cohere"
  | "xai";

export type ProviderCapability =
  | "text-generation"
  | "conversation"
  | "reasoning"
  | "tool-calling"
  | "structured-output"
  | "image-understanding"
  | "image-generation"
  | "video-generation"
  | "audio-input"
  | "speech-recognition"
  | "text-to-speech"
  | "embeddings"
  | "streaming"
  | "document-understanding"
  | "dialect-detection"
  | "video-job-status"
  | "video-retrieval"
  | "video-cancellation";

export type ProviderTask =
  | "translation"
  | "summarization"
  | "writing"
  | "coding"
  | "reasoning"
  | "classification"
  | "conversation";

export interface ProviderConfig {
  furahaAPI?: string;
  moodel?: string;
  /** @deprecated Use furahaAPI. */
  apiKey?: string;
  /** @deprecated Use moodel. */
  model?: string;
  capabilities?: ProviderCapability[];
  fetch?: typeof fetch;
}

export interface AbuurAIOptions {
  bixiye?: ProviderId;
  furahaAPI?: string;
  moodel?: string;
  tilmaamo?: string;
  /** @deprecated Use bixiye. */
  provider?: ProviderId;
  /** @deprecated Use moodel. */
  model?: string;
  /** @deprecated Use furahaAPI. */
  apiKey?: string;
  /** @deprecated Use tilmaamo. */
  instructions?: string;
  /** @deprecated Use tilmaamo. */
  systemPrompt?: string;
  providers?: Partial<Record<ProviderId, ProviderConfig>>;
  mode?: "manual" | "auto";
  language?: string;
  providerPreference?: ProviderId[];
  taskProviderPreferences?: Partial<Record<ProviderTask, ProviderId[]>>;
  pricing?: Record<string, ModelPricing | Record<string, ModelPricing>>;
  fetch?: typeof fetch;
}

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  [key: string]: number | undefined;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string | null;
  usage?: AIUsage;
  [key: string]: unknown;
}

export interface AIRequestOptions {
  bixiye?: ProviderId | string;
  moodel?: string;
  tilmaamo?: string;
  language?: string;
  /** @deprecated Use bixiye. */
  provider?: ProviderId | string;
  /** @deprecated Use moodel. */
  model?: string;
  signal?: AbortSignal;
}

export interface ModelSelectionOptions extends Record<string, unknown> {
  bixiye?: ProviderId | string;
  moodel?: string;
  /** @deprecated Use bixiye. */
  provider?: ProviderId | string;
  /** @deprecated Use moodel. */
  model?: string;
}

export interface ProviderCapabilityOptions {
  bixiye?: ProviderId | string;
  moodel?: string;
  /** @deprecated Use bixiye. */
  provider?: ProviderId | string;
  /** @deprecated Use moodel. */
  model?: string;
}

export interface ProviderRequest extends AIRequestOptions {
  prompt: string;
  systemPrompt?: string;
  operationInstructions?: string;
}

export interface AIStreamChunk {
  text?: string;
  delta?: string;
  usage?: AIUsage;
  [key: string]: unknown;
}

export interface ProviderAdapter {
  model?: string;
  capabilities?: ProviderCapability[];
  generate(request: ProviderRequest): Promise<AIResponse>;
  stream?(request: ProviderRequest): AsyncIterable<AIStreamChunk>;
}

export interface AbuurAIClient {
  weydii(question: string | { question?: string; "su'aal"?: string }, options?: AIRequestOptions): Promise<AIResponse>;
  wadaSheekeysi(message: string, options?: AIRequestOptions): Promise<AIResponse>;
  siiWad(message: string, options?: AIRequestOptions): Promise<AIResponse>;
  turjun(text: string, targetLanguage: string, options?: AIRequestOptions): Promise<AIResponse>;
  sooKoob(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  sharax(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  sax(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  dibUqor(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  hagaaji(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  balaadhi(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  qor(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  curi(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  fikrado(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  cinwaan(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  sameeSuaalo(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  falanqee(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  kalaSaar(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  dareen(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  sooSaarXog(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  isbarbarDhig(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  qorCode(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  sharaxCode(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  saxCode(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  dibUhabeeCode(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  nadiifi(options?: { bixiye?: ProviderId | string; provider?: ProviderId | string }): boolean;
  doorModel(options?: ModelSelectionOptions): Record<string, unknown>;
  awoodahaModelka(options?: ProviderCapabilityOptions): Record<string, unknown>;
  raadsoAqoon(input: { question: string; documents?: unknown[]; [key: string]: unknown }): Promise<{
    answer: string;
    sources: Array<Record<string, unknown>>;
    hasEnoughInformation: boolean;
    provider: string | null;
    model: string | null;
  }>;
  ogaawLuqad(input: string | { text: string }): Record<string, unknown>;
  ogaawLahjad(input: string | { text: string } & AIRequestOptions): Record<string, unknown> | Promise<Record<string, unknown>>;
  caadiyeQoraal(input: string | { text: string }): string | Record<string, unknown>;
  hadalUqor(input: { audio: string | Blob | ArrayBuffer | ArrayBufferView; mimeType?: string } & AIRequestOptions): Promise<AIResponse>;
  qoraalUhadal(input: { text: string } & AIRequestOptions): Promise<Record<string, unknown>>;
  wakiilAI(input: { task: string } & AIRequestOptions & Record<string, unknown>): Promise<Record<string, unknown>>;
  falanqeeSawir(input: { image: string | Blob | ArrayBuffer | ArrayBufferView; prompt: string; mimeType?: string } & AIRequestOptions): Promise<AIResponse>;
  falanqeeDukumenti(input: { document: string | Blob | ArrayBuffer | ArrayBufferView; prompt: string; mimeType?: string } & AIRequestOptions): Promise<AIResponse>;
  sooSaarJSON<T = unknown>(input: { prompt: string; schema: Record<string, unknown> } & AIRequestOptions): Promise<{ data: T } & Record<string, unknown>>;
  sameeEmbedding(input: { text?: string; texts?: string[] } & AIRequestOptions): Promise<{ embeddings: number[][] } & Record<string, unknown>>;
  isuEegEmbedding(left: number[], right: number[]): number;
  sameeSawir(input: { prompt: string } & AIRequestOptions & Record<string, unknown>): Promise<{ images: unknown[] } & Record<string, unknown>>;
  sameeMuuqaal(input: { prompt: string } & AIRequestOptions & Record<string, unknown>): Promise<VideoJob>;
  hubiMuuqaal(input: { id: string } & AIRequestOptions): Promise<VideoJob>;
  helMuuqaal(input: { id: string } & AIRequestOptions): Promise<unknown>;
  joojiMuuqaal(input: { id: string } & AIRequestOptions): Promise<unknown>;
  qulqul(input: { prompt: string } & AIRequestOptions): AsyncIterable<AIStreamChunk>;
  cabirIsticmaalka(options?: { reset?: boolean }): Record<string, unknown>;
  getConfig(): Omit<
    AbuurAIOptions,
    | "apiKey"
    | "furahaAPI"
    | "providers"
    | "bixiye"
    | "moodel"
    | "tilmaamo"
    | "provider"
    | "model"
    | "systemPrompt"
    | "instructions"
  > & {
    bixiye: string | null;
    moodel: string | null;
    tilmaamo: string | null;
    provider: string | null;
    model: string | null;
    systemPrompt: string | null;
    mode: "manual" | "auto";
  };
  getProviders(): string[];
  providers: {
    register(name: string, provider: ProviderAdapter): void;
    get(name: string): ProviderAdapter;
    list(): string[];
  };
}

export interface VideoJob {
  id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  [key: string]: unknown;
}

export declare function abuurAI(options?: AbuurAIOptions): AbuurAIClient;
export declare const version: string;

export interface SomaliPromptTemplate {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export declare const somaliPromptTemplates: readonly SomaliPromptTemplate[];
export declare function getSomaliPromptTemplate(id: string): SomaliPromptTemplate | undefined;
export declare function renderSomaliPromptTemplate(
  id: string,
  values: Record<string, string>
): string;
