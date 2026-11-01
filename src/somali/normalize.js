export function caadiyeQoraal(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Please provide non-empty text to normalize.");
  }

  return text
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
