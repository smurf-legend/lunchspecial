import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

// Built once per warm instance — the matcher's own setup (compiling the
// blacklist into regexes) is the expensive part, so it isn't worth redoing
// per call.
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
  // The recommended transformers collapse repeated letters to catch evasion
  // (e.g. "shiiit" -> "shit"), which also collapses legitimate words like
  // "shiitake" into a false positive. Whitelist known-safe words as they turn up.
  whitelistedTerms: ["shiitake"],
});

export function containsProfanity(text: string): boolean {
  return matcher.hasMatch(text);
}

// For chaining onto a zod field with `.refine(noProfanity, { message: ... })`
// — works for optional/nullable fields too, since an empty value has nothing
// to check.
export function noProfanity(value: string | null | undefined): boolean {
  return !value || !containsProfanity(value);
}
