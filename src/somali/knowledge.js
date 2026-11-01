const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_OVERLAP = 160;
const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
  "how", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
  "was", "what", "when", "where", "which", "who", "why", "with", "waa",
  "iyo", "maxaa", "sidee", "ku", "inay", "uu", "ay", "ka", "la", "soo"
]);

function validateDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("Please provide at least one document.");
  }

  documents.forEach((document, index) => {
    if (
      !document ||
      typeof document !== "object" ||
      typeof document.id !== "string" ||
      !document.id.trim() ||
      typeof document.content !== "string" ||
      !document.content.trim()
    ) {
      throw new Error(`Document ${index + 1} must have a non-empty id and content.`);
    }
  });
}

function splitDocument(document, chunkSize, overlap) {
  const content = document.content.trim();
  const chunks = [];
  let start = 0;

  while (start < content.length) {
    let end = Math.min(start + chunkSize, content.length);
    if (end < content.length) {
      const boundary = content.lastIndexOf(" ", end);
      if (boundary > start + chunkSize * 0.6) {
        end = boundary;
      }
    }

    const text = content.slice(start, end).trim();
    if (text) {
      chunks.push({
        documentId: document.id,
        chunkIndex: chunks.length,
        start,
        end,
        text
      });
    }

    if (end === content.length) {
      break;
    }

    start = Math.max(start + 1, end - overlap);
  }

  return chunks;
}

export function chunkDocuments(documents, options = {}) {
  validateDocuments(documents);
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;

  if (!Number.isInteger(chunkSize) || chunkSize < 100) {
    throw new Error("chunkSize must be an integer of at least 100 characters.");
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new Error("overlap must be a non-negative integer smaller than chunkSize.");
  }

  return documents.flatMap((document) =>
    splitDocument(document, chunkSize, overlap)
  );
}

function queryTokens(text) {
  return (text.toLocaleLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [])
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

export function retrieveRelevantChunks(question, chunks, options = {}) {
  const limit = options.limit ?? 4;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Retrieval limit must be a positive integer.");
  }

  const terms = [...new Set(queryTokens(question))];
  if (terms.length === 0) {
    return [];
  }

  const ranked = chunks.map((chunk) => {
    const text = chunk.text.toLocaleLowerCase();
    const matchedTerms = terms.filter((term) => text.includes(term));
    const score = matchedTerms.length / terms.length;
    return { ...chunk, score, matchedTerms };
  });

  return ranked
    .filter((chunk) => chunk.matchedTerms.length > 0)
    .sort((left, right) =>
      right.score - left.score || left.documentId.localeCompare(right.documentId) ||
      left.chunkIndex - right.chunkIndex
    )
    .slice(0, limit);
}
