const somaliWords = new Set([
  "af", "ahay", "ahayn", "ahay", "aniga", "ayaa", "aad", "iska", "maanta",
  "maxaa", "maxay", "sidee", "soomaali", "somali", "tahay", "tihiin",
  "waad", "waa", "waxa", "waxaan", "waxay", "iyo", "lama", "walaal",
  "nabad", "salaan", "asc", "mahadsanid", "fiican", "joogaa", "jirtaa"
]);

const englishWords = new Set([
  "a", "about", "are", "and", "can", "do", "for", "from", "hello", "how",
  "in", "is", "it", "of", "on", "please", "say", "the", "this", "to",
  "what", "where", "with", "you", "your", "good", "morning", "today"
]);

const otherLanguageWords = [
  ["es", new Set(["hola", "gracias", "como", "estás", "buenos", "por", "favor"])],
  ["fr", new Set(["bonjour", "merci", "comment", "vous", "êtes", "avec", "pour"])],
  ["ar", new Set(["مرحبا", "السلام", "عليكم", "كيف", "شكرا"])],
  ["pt", new Set(["olá", "obrigado", "obrigada", "como", "você"])]
];

function tokenize(text) {
  return text.toLocaleLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
}

function result(language, languages, confidence) {
  return {
    language,
    languages,
    confidence,
    method: "heuristic",
    confidenceType: "uncalibrated-heuristic"
  };
}

export function ogaawLuqad(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Please provide valid text for language detection.");
  }

  const tokens = tokenize(text);
  if (tokens.length < 2) {
    return result("unknown", [], 0);
  }

  const somaliMatches = tokens.filter((token) => somaliWords.has(token)).length;
  const englishMatches = tokens.filter((token) => englishWords.has(token)).length;

  if (somaliMatches > 0 && englishMatches > 0) {
    return result("mixed", ["so", "en"], 0.65);
  }
  if (somaliMatches > 0) {
    return result("so", ["so"], Math.min(0.9, 0.55 + somaliMatches * 0.08));
  }
  if (englishMatches >= 2) {
    return result("en", ["en"], Math.min(0.85, 0.5 + englishMatches * 0.05));
  }

  const scripts = [
    ["ar", /[\u0600-\u06ff]/u],
    ["ru", /[\u0400-\u04ff]/u],
    ["zh", /[\u3400-\u9fff]/u],
    ["ja", /[\u3040-\u30ff]/u],
    ["ko", /[\uac00-\ud7af]/u],
    ["hi", /[\u0900-\u097f]/u]
  ];
  const detectedScript = scripts.find(([language, pattern]) =>
    pattern.test(text) && language !== "ar"
  ) || scripts.find(([language, pattern]) => language === "ar" && pattern.test(text));

  if (detectedScript) {
    return result(detectedScript[0], [detectedScript[0]], 0.7);
  }

  for (const [language, words] of otherLanguageWords) {
    if (tokens.some((token) => words.has(token))) {
      return result(language, [language], 0.6);
    }
  }

  return result("unknown", [], 0);
}
