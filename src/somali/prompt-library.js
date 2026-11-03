const defaultLanguageGuidance =
  "Haddii qofku si cad u codsado luqad kale, ku jawaab luqaddaas; haddii kale, ku jawaab af-Soomaali dabiici ah oo cad.";

export const somaliPromptTemplates = Object.freeze([
  {
    id: "somali-assistant",
    name: "Kaaliyaha Af-Soomaaliga",
    description: "Kaaliye si cad oo naxariis leh uga jawaaba su'aalaha.",
    prompt: `${defaultLanguageGuidance} Si taxaddar leh uga jawaab su'aasha, sheeg haddii aanad hubin, hana samayn xog aan jirin.\n\nSu'aal: {{prompt}}`
  },
  {
    id: "writing",
    name: "Qorista iyo sixidda qoraalka",
    description: "Qor ama hagaaji qoraal adigoo ilaalinaya ujeeddadiisa.",
    prompt: `${defaultLanguageGuidance} Qor ama sax qoraalka soo socda. Ilaali macnaha iyo codka qoraaga; soo celi qoraalka keliya haddii aan sharaxaad la codsan.\n\nQoraal ama codsi: {{prompt}}`
  },
  {
    id: "translation",
    name: "Turjumaadda",
    description: "Turjun qoraal si sax ah oo dabiici ah.",
    prompt: "U turjun qoraalkan {{targetLanguage}} si sax ah oo dabiici ah. Ku jawaab luqadda la codsaday oo keliya, hana ku darin faallo kale.\n\nQoraal: {{prompt}}"
  },
  {
    id: "education",
    name: "Barashada iyo waxbarashada",
    description: "Sharax fikradaha oo u kala dhig tallaabooyin la fahmi karo.",
    prompt: `${defaultLanguageGuidance} U sharax mawduuca si arday bilow ah u fahmi karo. Adeegso tusaalooyin iyo tallaabooyin gaagaaban marka ay waxtar leeyihiin.\n\nMawduuc: {{prompt}}`
  },
  {
    id: "coding",
    name: "Qorista koodhka",
    description: "Ka caawi qorista ama fahamka koodhka, adigoo aqbalaya codsiyada luqad kale.",
    prompt: `${defaultLanguageGuidance} Ka caawi codsiga koodhka. Sharax go'aamada si kooban, oo bixi koodh si fudud loo tijaabin karo.\n\nCodsiga: {{prompt}}`
  },
  {
    id: "question-answer",
    name: "Su'aalo iyo jawaabo",
    description: "Su'aalaha uga jawaab si toos ah, kuna salee xogta la bixiyey.",
    prompt: `${defaultLanguageGuidance} Su'aasha si toos ah uga jawaab adigoo adeegsanaya xogta la bixiyey. Haddii xogtu ku filnayn, sheeg waxa maqan.\n\nSu'aal: {{prompt}}`
  },
  {
    id: "business",
    name: "Ganacsiga",
    description: "Ka caawi qorshaynta, adeegga macaamiisha, iyo qoraalka ganacsiga.",
    prompt: `${defaultLanguageGuidance} Sii talo ganacsi oo wax-ku-ool ah, kala saar xaqiiqooyinka iyo fikradaha, hana ballanqaadin natiijooyin aan la hubin.\n\nCodsiga ganacsiga: {{prompt}}`
  },
  {
    id: "research",
    name: "Cilmi-baarista",
    description: "Soo koob ama falanqee xogta la bixiyey adigoon samayn tixraacyo.",
    prompt: `${defaultLanguageGuidance} Falanqee xogta la bixiyey, muuji qodobada muhiimka ah iyo hubanti la'aanta. Ha samayn ilo ama tixraacyo aan lagu siin.\n\nMawduuca ama xogta: {{prompt}}`
  }
].map((template) => Object.freeze(template)));

export function getSomaliPromptTemplate(templateId) {
  if (typeof templateId !== "string" || !templateId.trim()) {
    throw new Error("Provide a Somali prompt template identifier.");
  }
  const template = somaliPromptTemplates.find(({ id }) => id === templateId);
  if (!template) {
    throw new Error(`Unknown Somali prompt template "${templateId}".`);
  }
  return template;
}

export function renderSomaliPromptTemplate(templateId, values = {}) {
  const template = getSomaliPromptTemplate(templateId);
  const prompt = values.prompt;
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Provide text to fill the Somali prompt template.");
  }
  return template.prompt
    .replaceAll("{{prompt}}", prompt.trim())
    .replaceAll("{{targetLanguage}}", (
      typeof values.targetLanguage === "string" && values.targetLanguage.trim()
        ? values.targetLanguage.trim()
        : "luqadda aad dooratay"
    ));
}
