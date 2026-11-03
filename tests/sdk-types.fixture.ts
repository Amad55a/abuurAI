import {
  abuurAI,
  createSomaliAI,
  type AIResponse,
  type ProviderCapability,
  type AbuurAIOptions,
  type SomaliAIOptions
} from "../src/index.js";

const options: AbuurAIOptions = {
  bixiye: "gemini",
  furahaAPI: "example-key",
  moodel: "gemini-2.5-flash",
  tilmaamo: "Ku jawaab Af-Soomaali.",
  providers: {
    gemini: { moodel: "gemini-2.5-flash" }
  },
  gateway: {
    type: "cloudflare",
    accountId: "0123456789abcdef0123456789abcdef",
    gatewayId: "somali-gateway",
    endpoint: "http://localhost:8787"
  }
};

const ai = abuurAI(options);
const configProvider = ai.getConfig().bixiye;
const selected = ai.doorModel({ bixiye: "gemini", moodel: "gemini-2.5-flash" });
const answer: Promise<AIResponse> = ai.weydii("Salaan!");
const connectedAi = createSomaliAI({
  provider: "gemini",
  gateway: "connected",
  gatewayEndpoint: "/api/somali-ai",
  gatewayTimeoutMs: 30_000
});
const connectedAnswer: Promise<AIResponse> = connectedAi.weydii("Salaan!");
const capabilities: ProviderCapability[] = ["text-generation", "streaming"];
const compatibilityOptions: SomaliAIOptions = {
  provider: "gemini",
  apiKey: "legacy-key",
  model: "gemini-2.5-flash",
  systemPrompt: "Legacy compatibility."
};
const normalized = ai.caadiyeQoraal("Salaan!");
const operations = [
  ai.wadaSheekeysi("Salaan!"),
  ai.siiWad("Sii wad."),
  ai.turjun("Hello", "Somali"),
  ai.sooKoob("Qoraal dheer."),
  ai.qorCode("Samee function."),
  ai.falanqeeSawir({ image: new Blob(), prompt: "Sharax sawirka." }),
  ai.falanqeeDukumenti({ document: "Qoraal", prompt: "Soo koob." }),
  ai.sooSaarJSON({ prompt: "Soo saar xog.", schema: { type: "object" } }),
  ai.sameeEmbedding({ text: "Salaan" }),
  ai.sameeSawir({ prompt: "Sawir xeeb." }),
  ai.sameeMuuqaal({ prompt: "Muuqaal gaaban." }),
  ai.hubiMuuqaal({ id: "job-id" }),
  ai.raadsoAqoon({ question: "Maxaa ku jira?" }),
  ai.qulqul({ prompt: "Salaan" })
];

void answer;
void configProvider;
void selected;
void connectedAnswer;
void capabilities;
void compatibilityOptions;
void normalized;
void operations;
