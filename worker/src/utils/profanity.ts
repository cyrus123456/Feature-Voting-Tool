import wordList from "../data/sensitive-words.json";

/**
 * Open-source sensitive-word filter (zero runtime deps).
 *
 * Matching is two-pass and script-aware:
 *  - Latin (en/vi) single-word terms -> whole-token Set match (word-boundary
 *    semantics, so "Scunthorpe" never matches "scun").
 *  - Chinese terms + any multi-word phrase -> substring match (CJK is
 *    unsegmented, so boundaries don't apply).
 *
 * Known limitation: no leetspeak / whitespace-breaking / homoglyph decoding.
 * This is a starter filter; lists are curated and editable in
 * ../data/sensitive-words.json.
 */

interface WordLists {
  en: string[];
  vi: string[];
  zh: string[];
}

const lists = wordList as WordLists;

// Build lookup structures once at module load (the Worker isolate is reused,
// so this is effectively cached across requests).
const latinTokenSet = new Set<string>();
const substringTerms: string[] = [];

function classify(terms: string[]): void {
  for (const raw of terms) {
    const term = raw.trim().toLowerCase();
    if (!term) continue;
    if (term.includes(" ")) {
      // Multi-word phrase (e.g. Vietnamese "mẹ kiếp") -> substring pass.
      substringTerms.push(term);
    } else {
      latinTokenSet.add(term);
    }
  }
}

classify(lists.en);
classify(lists.vi);
// Chinese terms are matched as substrings regardless of length.
for (const raw of lists.zh) {
  const term = raw.trim();
  if (term) substringTerms.push(term.toLowerCase());
}

// Split on Unicode non-letter/non-digit boundaries, keeping apostrophes and
// hyphens inside tokens (so "don't" and "mother-fucker" tokenize sensibly).
function tokenize(normalized: string): string[] {
  return normalized.split(/[^\p{L}\p{N}'-]+/u);
}

export interface DetectionResult {
  clean: boolean;
  matched: string[];
}

export function detectSensitiveWords(text: string): DetectionResult {
  if (!text) return { clean: true, matched: [] };

  const normalized = text.normalize("NFKC").toLowerCase();
  const matched = new Set<string>();

  // Pass 1: whole-token match for latin single-word terms.
  const tokens = tokenize(normalized);
  for (const token of tokens) {
    if (token && latinTokenSet.has(token)) matched.add(token);
  }

  // Pass 2: substring match for CJK terms and multi-word phrases.
  for (const term of substringTerms) {
    if (normalized.includes(term)) matched.add(term);
  }

  return { clean: matched.size === 0, matched: [...matched] };
}

/**
 * Handler-facing convenience matching the existing validator style.
 * Runs the detector over every provided field (nullish fields are skipped)
 * and returns a ready-to-use English error message on the first hit, or null
 * when all fields are clean. Returns a string (not a Response) because
 * jsonResponse/corsHeaders are per-file and not centrally exported.
 *
 * Matched words are logged server-side only and never echoed to the client
 * (avoids leaking the blocklist / aiding evasion).
 */
export function assertNoSensitiveWords(
  ...fields: Array<string | null | undefined>
): string | null {
  for (const field of fields) {
    if (typeof field !== "string" || field.length === 0) continue;
    const result = detectSensitiveWords(field);
    if (!result.clean) {
      console.warn(
        `[profanity] blocked content, matched terms: ${result.matched.join(", ")}`,
      );
      return "Your content contains language that isn't allowed. Please revise and try again.";
    }
  }
  return null;
}
