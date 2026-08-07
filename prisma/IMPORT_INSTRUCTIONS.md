# Bulk special import — instructions for the research LLM

You're researching **real, currently-advertised lunch specials** at real venues in Sydney, Australia, to seed a lunch-deals site. Output a JSON array matching the schema below. Nothing else — no markdown, no commentary, just the JSON array (or write it straight to a `.json` file if you have file access).

## Rules

- **Only real venues and real, currently-advertised deals.** Find these via web search (official venue websites, social media, review sites, voucher/deal aggregators). Don't invent plausible-sounding specials — an empty result for a suburb is fine, a fabricated one is not.
- **Write descriptions in your own words.** Don't copy marketing copy verbatim — summarize what the deal actually is (1-2 sentences).
- **Include a source `url`** whenever you found the deal on a real page (the venue's own site, a menu page, a social post). Omit the field if you can't find one — don't guess a URL.
- **`suburbSlugs` must come from `prisma/suburb-reference.json`** (in this same folder) — match by suburb name, use the `slug` field exactly as given there. If a venue's suburb isn't in that file, skip it rather than guessing a slug.
- **`categorySlugs` must be from this exact list** (at least one, can be more than one):
  `african, american, asian, cafe, chinese, fast-food, greek, indian, indonesian, italian, japanese, khmer, korean, lao, malaysian, mexican, middle-eastern, nepalese, poke-salad-bowls, pub-food, sandwiches-rolls, south-american, take-away, thai, vegan-vegetarian, vietnamese`
- **`chainWide: true`** only for a genuine nationwide/city-wide chain deal available at effectively all locations of that chain (e.g. a McDonald's app deal) — in that case `suburbSlugs` can be empty. For anything else (independent venues, or a chain deal only confirmed at specific locations), use `suburbSlugs` with the specific suburb(s) and leave `chainWide` false/omitted.
- **Don't duplicate what's likely already there** — the import script will catch exact venue+price/title duplicates automatically, so don't worry about checking the existing database yourself, just don't deliberately submit the same deal twice within your own output.

## Output schema

```json
[
  {
    "title": "Chicken Parma & Chips",
    "description": "A classic chicken parmigiana with chips and salad, part of the pub's weekday lunch menu.",
    "venueName": "The Example Hotel",
    "address": "123 Main St, Suburbtown",
    "url": "https://theexamplehotel.com.au/lunch",
    "imageUrl": null,
    "usualPrice": 22,
    "specialPrice": 17,
    "availableDays": "Mon,Tue,Wed,Thu,Fri",
    "startTime": "11:30",
    "endTime": "14:30",
    "suburbSlugs": ["suburbtown"],
    "chainWide": false,
    "categorySlugs": ["pub-food"],
    "couponCode": null,
    "greatValue": false
  }
]
```

**Field notes:**
- `title` — 5-200 chars, short and specific, but **no price or discount value in it** (e.g. "Chicken Parma & Chips", not "$17 chicken parma & chips" or "40% off"). `specialPrice`/`usualPrice` already render prominently next to the title and feed the page's JSON-LD `Offer` data, so repeating the number in `title` is redundant and wastes characters in a title tag that's already truncated once `venueName`/suburb are appended. Name the dish/deal itself, not "Lunch special" generically either.
- `description` — at least 10 chars, your own words.
- `venueName` — the business name only, not the suburb.
- `address` — optional, street address if known.
- `url` — optional, must be a real, working URL if included.
- `imageUrl` — optional, best-effort only. If the venue's page has a real photo of the dish or venue, include its direct image URL (must actually be an image file, not a page link). If there's no image, or you're not sure, omit the field entirely — don't guess a URL and never generate/fabricate an image.
- `usualPrice` — optional, only if there's a genuine "normally $X" comparison.
- `specialPrice` — required, the deal price as a number (no `$`).
- `availableDays` — optional, comma-separated from `Mon,Tue,Wed,Thu,Fri,Sat,Sun`. Omit to default to weekdays.
- `startTime` / `endTime` — optional, 24h `"HH:MM"` format, only if the deal has specific hours.
- `suburbSlugs` — array of slugs from `suburb-reference.json`. Empty array only allowed if `chainWide: true`.
- `chainWide` — see rule above. Defaults to false.
- `categorySlugs` — at least one slug from the list above.
- `couponCode` — optional, only if the deal genuinely requires a voucher/app code.
- `greatValue` — optional, true only for exceptionally good ongoing value deals (use sparingly).

## After research is done

Save the JSON array to a file (e.g. `specials-batch-1.json`), then hand it back — it gets imported with:

```
npx tsx prisma/import-specials.ts specials-batch-1.json --dry-run   # preview first
npx tsx prisma/import-specials.ts specials-batch-1.json             # then actually import
```

The import script validates every field, checks suburb/category slugs are real, and skips anything that looks like a duplicate of an existing special (same venue + same suburb + matching price or title) — so it's safe to run multiple batches over time without manually cross-checking against what's already live.
