import {
  abuurAI,
  type AIResponse,
  type ProviderCapability,
  type AbuurAIOptions
} from "../src/index.js";

const options: AbuurAIOptions = {
  bixiye: "gemini",
  furahaAPI: "example-key",
  moodel: "gemini-2.5-flash",
  tilmaamo: "Ku jawaab Af-Soomaali.",
  providers: {
    gemini: { moodel: "gemini-2.5-flash" }
  }
};

const ai = abuurAI(options);
const configProvider = ai.getConfig().bixiye;
const selected = ai.doorModel({ bixiye: "gemini", moodel: "gemini-2.5-flash" });
const answer: Promise<AIResponse> = ai.weydii("Salaan!");
const capabilities: ProviderCapability[] = ["text-generation", "streaming"];
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
void capabilities;
void normalized;
void operations;
