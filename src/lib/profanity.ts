import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

// Built once per warm instance — the matcher's own setup (compiling the
// blacklist into regexes) is the expensive part, so it isn't worth redoing
// per call.
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
  // Real words that happen to contain a blacklisted substring (the
  // "Scunthorpe problem") — verified against the actual matcher, not just
  // guessed, so this list doesn't carry words that were never a problem.
  // Deliberately excludes words that are ambiguous or genuinely used as
  // slurs/profanity in common usage despite a narrow legitimate meaning
  // (e.g. "faggot" as a British offal dish, "retarded", "cuckold", "hookers")
  // — those stay blocked rather than risk letting the real usage through.
  whitelistedTerms: [
    "shiitake",
    "cumberland",
    "assortment",
    "cumin",
    "cumquat",
    "fagioli",
    "fagiolini",
    "fagottini",
    "cockscomb",
    "cockpit",
    "retardant",
    "cummerbund",
  ],
});

export function containsProfanity(text: string): boolean {
  return matcher.hasMatch(text);
}

// The exact substrings that tripped the filter, deduplicated in the order
// they appear — lets error messages name the actual word instead of a
// generic "not allowed", which otherwise leaves people guessing (as
// "shiitake" did before it was whitelisted).
export function getProfanityMatches(text: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const match of matcher.getAllMatches(text)) {
    const word = text.slice(match.startIndex, match.endIndex + 1);
    const key = word.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      words.push(word);
    }
  }
  return words;
}

// For chaining onto a zod field with `.refine(noProfanity, { message: ... })`
// — works for optional/nullable fields too, since an empty value has nothing
// to check.
export function noProfanity(value: string | null | undefined): boolean {
  return !value || !containsProfanity(value);
}

// Builds a zod refine message that names the offending word(s) instead of
// a generic message. Usage: `.refine(noProfanity, profanityMessage("Title"))`.
export function profanityMessage(fieldLabel: string) {
  return (value: string) => {
    const words = getProfanityMatches(value);
    const detail = words.length > 0 ? `: "${words.join('", "')}"` : "";
    return { message: `${fieldLabel} contains language that isn't allowed${detail}` };
  };
}
