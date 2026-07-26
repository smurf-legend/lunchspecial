---
name: verify-special-source
description: Audit or newly create a lunch Special by going to its real source (a venue's webpage or a PDF menu), extracting accurate text, and capturing a real screenshot/crop of the actual deal to use as the image — rather than leaving the image blank or using a generic/wrong one. Also covers detecting venues with a different special each day of the week (one Special per day, not a single generic post), and recognizing when a listing is stale and should be deleted rather than fixed. Use when reviewing existing Specials for accuracy, or when entering new ones for a venue/state.
---

# Verify or extract a lunch special from its real source

Three source shapes have come up so far. The first two need the same end
result: accurate title/price/days/times/description, a `url` that points at
the actual specials info (not just the homepage), and a real image of the
actual deal (not a stock photo, not a generic page, not left blank). The
third (Case C) is a different failure mode entirely — not wrong data, but
the wrong *number of posts*. A fourth situation (below, "When there's no
current special") isn't a source shape at all — it's when the audit should
conclude "delete this" rather than "fix this".

**Before doing anything else, check whether the special varies by day or by
tier** (Case C) — if it does, that changes everything else about how this
venue gets entered, so check this first, not after already writing one post.

## Members-only and delivery flags

`Special` has `membersOnly` and `deliveryAvailable` booleans (both default
false, independent of each other — added 2026-07-26). Set `membersOnly:
true` only when the source explicitly says so ("Members only", "Members
and Dine-in Only" — Cabravale's District 8 and Bistro 1925 both state this
outright). Same bar as `greatValue`: don't infer it from venue type (e.g.
don't assume a club/RSL is members-only just because some are — check the
actual page). `deliveryAvailable` likewise only when a delivery
platform/link is actually mentioned, not assumed from venue type. Leave
both false/unset if the source doesn't say, rather than guessing — a wrong
`false` (silently missing a real restriction) is a worse failure than an
absent badge, but don't flip it to `true` without a real statement to
point to.

## Title, price, and description formatting

Applies to every case below (A, B, and C alike), and to step 4 of "Shared
steps."

- **No price in `title`.** The app shows `specialPrice`/`usualPrice` in a
  bigger, more prominent spot right next to the title, so `"$18 burgers"`
  is redundant — title the item itself: `"Burgers"`. This is an SEO rule as
  much as a UX one: the dish name is what actually captures search intent
  ("steak lunch Clovelly" is a real query, "$18 lunch Clovelly" isn't), and
  price isn't lost by leaving it out of the title text — it's already
  carried independently via the page's JSON-LD `Offer` structured data
  (`buildOfferJsonLd`), so Google can still surface it in a rich snippet
  regardless. Every character spent on "$18 " in the title is a character
  not spent on dish keywords, in a title tag that's already truncated
  around 50-60 characters once `venueName` and suburb are auto-appended.
  **If sibling rows for the same venue already have price-first titles,
  that's not a reason to match them** — it means those rows are wrong too
  and worth fixing while you're in there, not a convention to extend.
- **No generic titles like "Lunch Special" or "Lunch Menu."** Name the dish,
  or the choice of dishes, not the category the reader already knows it's
  in. `"Fisherman Basket - Monday Special"`, not `"$15 Fisherman Basket -
  Monday Special"` or just `"Lunch Special"`.
- **`description` is about the food, not the venue.** Venue name, address,
  and "a dedicated X shop on Y street" framing already have their own
  fields (`venueName`, `address`) — repeating them in `description` is
  redundant filler. Describe the dish: what's in it, how it's prepared,
  what makes it worth ordering.
- **No verification/sourcing notes in `description`.** "Confirmed against
  the venue's own menu," "DoorDash lists it higher, which looks like
  markup," "no real photo was available this pass" — that's your working
  notes, not customer-facing copy. Put anything unverifiable in
  `needsReviewNote` instead, and keep `description` to the fact itself.
- **Real line breaks (`\n\n`) between items**, not one run-on paragraph, when
  a description lists multiple options with their own detail. One item per
  paragraph, the way `src/app/specials/new/page.tsx`'s textarea would render
  it if typed by hand — the detail page already renders `\n\n` correctly
  (`whitespace-pre-line`).
- **A price with no discount and no "usually $X" isn't a "special" — but
  that doesn't automatically mean `greatValue` either.** `greatValue`
  ("Everyday Value") is for a price that's genuinely good against what
  that dish normally costs elsewhere, not just "not a discount." If the
  price is merely average for the category — Tenkomori's Chatswood ramen
  turned out to be $20.90–$21.40, squarely in the normal $18–24 range for
  Sydney ramen, nothing cheap about it — it isn't a deal *or* an everyday
  value, it's just a menu price with nothing special to say about it:
  **delete it**, same as Get Sashimi below. Reserve `greatValue` for cases
  where you can actually argue the price is low for what it is (Marrickville
  Pork Roll's $9 banh mi, or a $9 lemongrass beef banh mi against a $15+
  Sydney norm) — if you can't make that case, it's either a real discount
  (`usualPrice` set) or it doesn't belong on the site.

## Case A — the deal is a PDF (e.g. Newtown Hotel)

The venue's site has no lunch-special content itself, only a "Download Menu"
PDF link, and the deal is buried on one page among several unrelated ones.

1. Download the PDF into the scratchpad (state filename/source/size first —
   these Canva-designed pub menus can be surprisingly large, e.g. 13.6MB for
   5 pages).
   ```
   curl -sL -o menu.pdf "<pdf-url>"
   pdfinfo menu.pdf   # page count/size sanity check
   ```
2. Read the full text with the Read tool (`pages: "1-N"`) to find which page
   has the actual lunch special, and note the exact price/items/days/time
   window verbatim.
3. Render just that page to a real image and crop to the relevant box:
   ```
   pdftoppm -f <page> -l <page> -r 300 -png menu.pdf page
   ```
   ```python
   from PIL import Image
   img = Image.open('page-N.png')
   w, h = img.size
   crop = img.crop((int(w*X0), int(h*Y0), int(w*X1), int(h*Y1)))  # iterate bounds, view, tighten
   crop.convert('RGB').save('crop.jpg', quality=90)
   ```

## Case B — the deal is right there on a normal webpage (e.g. Clock Hotel)

More common case. The venue's `/lunch-specials` (or similar) page lists the
items directly in HTML — no PDF involved. The fix here is almost always just
"there's no image", because the text was already entered correctly from the
page.

The in-session browser pane **cannot** be used for this — its `zoom`
region-crop is not supported (confirmed: returns the full screenshot
uncropped), so there is no way to get a clean, precisely-cropped image
through it. Use a local headless Playwright/Chromium render instead, which
writes a real PNG file you can crop with PIL:

```
npx --yes playwright screenshot --viewport-size "1000,1400" \
  --wait-for-timeout 1500 "<page-url>" full.png
```
(Playwright's Chromium is already cached at `~/Library/Caches/ms-playwright`
on this machine — no install needed. If it's ever missing, `npx playwright
install chromium` will fetch it; confirm with the user first since it's a
sizeable download.)

Then view `full.png` with the Read tool, identify the pixel range that
covers just the specials content (heading through the last item —
excluding the site's nav/header and anything below like a photo gallery or
mailing-list signup), and crop:
```python
from PIL import Image
img = Image.open('full.png')
crop = img.crop((0, y_top, w, y_bottom))
crop.save('crop.png')
```

**If the page has a real photo of the actual dish, crop to *just the photo*
— never bake the adjacent text into the image.** First instinct on Hotel
Bondi was to crop each offer's text+photo pair together (like the Case B
plain-text crops), but the user corrected this: the image should be the
dish photo alone; every fact from the text (choices, price, days/times)
belongs in the `description` field instead, which the special detail page
already renders as real text in the site's own typography. A screenshot of
small text baked into a photo is redundant with that and looks worse.
So: two genuine offers on one page (Hotel Bondi's "$20 Lunch" burger photo
and separate "Bondi Roast" photo) → two separate photo-only crops, one per
offer, with all the copy living in each Special's `description`.

**Exception: this only holds when the photo actually represents what the
special is.** Hotel Bondi's "$20 Lunch" is one specific dish choice per
person, so a clean photo of that one burger is accurate. Surry Hills
Hotel's Mana Lunch Special is a mix of Thai dishes and pub classics (cashew
nut chicken, khao gai yang, green curry, a beef burger, a chicken schnitzel
burger, a seafood basket) — cropping to just the one pad-thai-style noodle
photo that happened to be on the page made it look like the deal *was* that
dish, which is wrong; it's one of six unrelated options. For a deal like
this with no single representative dish, the venue's own branded graphic —
even with "MANA LUNCH SPECIAL", "MONDAY TO FRIDAY", "FROM $16.90" baked
into it — is the more accurate image, because it correctly signals "this is
a multi-dish deal" rather than misrepresenting it as one specific dish.
So: before cropping to just a photo, check whether the special is a single
dish/item (photo-only is right) or a mixed/multi-option deal with no one
dish that stands for the whole thing (the venue's own branded graphic,
text and all, is more honest than a misleadingly specific food photo).
This only applies when the source actually has a separate photo to isolate.
For plain-text-only pages with no food photography at all (Clock Hotel,
Bondi Trattoria, Newtown Hotel's PDF), there's no photo to pull out — the
text-block screenshot remains the only real image material available, so
that stays the image in those cases (its content still belongs in
`description` too, just not literally re-rendered as an image element).

**A `url` of `null`/empty on an existing Special is itself a signal to
investigate**, same as a wrong field — it means there's no source at all to
verify against yet, not just an inaccurate one. If the venue is part of a
larger group (Hotel Bondi and Clock Hotel are both run by Maloney Hotels,
for instance), the venue's own domain may just redirect to the group's
site — check the group site's nav for a venue-specific "Specials" link
rather than assuming there's nothing findable.

## Case C — the venue has more than one genuinely distinct offer (e.g. Club Hotel Mount Druitt, Callao)

This is not a text/image accuracy problem — it's a wrong *shape* problem:
one Special row is trying to represent more than one real, separately
priced/described offer, and collapsing them loses information a visitor
would actually want to compare. This shows up two ways:

- **Different day, different dish** — Club Hotel Mount Druitt runs a
  genuinely different dish each weekday (Monday: Fisherman Basket, Tuesday:
  Chicken Schnitzel, Wednesday: Chicken Curry, Thursday: Rump Steak, Friday:
  Fish and Chips, Saturday: Pasta Day, Sunday: Roast Pork — all $15), each
  with its own photo on the venue's site/socials. The original mistake was
  posting this as a **single** generic Special titled just "Lunch Special"
  with `availableDays` covering the whole week and no image.
- **Same day, different tier** — Callao's Express Lunch is 2 courses for
  $49 *or* 3 courses for $59, both weekdays 12–3pm, both from the exact same
  promo. Only the 2-course tier had been entered; the 3-course option was
  simply missing as its own Special. Same underlying mistake as the day
  case — a second genuinely distinct, separately priced offer wasn't given
  its own row — just triggered by a course-count tier instead of a weekday.

**The fix is one Special per distinct offer, not one Special covering all of them:**

- Check the venue's site/Facebook/Instagram for a day-by-day breakdown
  *and* re-read the page for "or"/tiered wording ("2 courses at $X or 3
  courses at $Y") before writing anything — either signals Case C,
  regardless of what source shape (webpage/PDF) the info came from.
- For the tier variant (Callao): both offers share the same days, hours,
  venue, `url`, and promo image — only `title`, `description`, and
  `specialPrice` actually differ between them, so there's no need to
  re-source a new image, just create the sibling row with those three
  fields changed.
- For the day variant (Club Hotel Mount Druitt), each day gets its own
  Special row: `availableDays` set to just that one day code (`"Mon"`, not
  `"Mon,Tue,Wed,Thu,Fri"`), a day-specific title
  (`"Fisherman Basket - Monday Special"`), and — when the source actually
  has a distinct photo per day (like Club Hotel Mount Druitt's socials) —
  that day's own screenshot rather than a shared image.
  **But** if the source is just one plain-text listing of all the days
  together with no per-day photos (e.g. Bondi Trattoria's "Special Offers"
  page — Monday risotto/Tuesday pasta/Wednesday steak/Thursday oysters all
  in one text block, one nearby food photo), don't force separate crops
  that don't exist: take one screenshot of the whole block (same as Case B)
  and reuse it across all the day-specific rows. The rule is "one Special
  per day," not "one unique image per day" — the image only splits apart
  when the source itself provides separate photos to split.
- If an existing generic single post already exists for this venue, don't
  leave it alongside the new day-specific ones as a leftover duplicate —
  either delete it or, better, turn it directly into the Monday (or
  whichever day it already matches) entry, the way the Club Hotel Mount
  Druitt Monday post was the original single post edited in place rather
  than an extra eighth row.
- Use the app's own **Duplicate** admin feature (`DuplicateSpecialButton`,
  on the special detail page and kitchen list — `POST
  /api/admin/specials/[id]/duplicate`) to create day 2 through 7 quickly:
  it clones venue/price/suburb/etc. into a new post and drops you into the
  edit page, so you only need to change the title, day, description, and
  image each time rather than rebuilding the whole form from scratch. This
  feature exists specifically for this same-venue-different-day pattern.

## When there's no current special — delete, don't force a fix (e.g. It's Time For Thai, Newtown)

Sometimes the honest conclusion is that the deal doesn't exist anymore, and
the right action is deleting the post, not patching its fields. Signs of
this, from a real case:

- The PDF/source's prices are roughly double (or otherwise clearly out of
  step with) the venue's actual current menu prices — a strong signal the
  PDF predates a price rise and was never updated.
- The venue's own site sometimes says this outright — e.g. "Menu (Note:
  Price on pdf may not be up-to-date)" — which is as close to a direct
  admission as you'll get.
- No lunch-special or all-day-special content exists anywhere on the
  venue's current site (or socials) to replace it with.
- The venue has visibly repositioned since the special was entered — e.g.
  The Abercrombie Hotel's site now brands it "Sydney's Best Late-Night Bar
  & Club" with a full-price à la carte menu and no by-the-slice pizza
  anywhere; that kind of rebrand is itself evidence a cheap daytime special
  is gone, even before checking prices.
- A dedicated deals-aggregator site for the area (one that exists
  specifically to track these promos, e.g. eatdrinkcheap.com.au) explicitly
  says something like "No weekly specials on file for this venue" — treat
  that as corroborating evidence, not proof on its own, but a real signal
  worth weighing alongside the venue's own site.
- **The source article itself is old — treat that as a reason to lean
  toward deleting, not as something a review or two can outweigh.** Manly
  Thai Gourmet's $12 lunch menu was sourced from a "Manly food deals"
  roundup dated 2024/03 — over two years stale by the time it was audited.
  Finding a couple of recent reviews that still mention "the $12 deal" felt
  like corroboration, but it wasn't a real check against the venue's
  current, actual offering — it was just evidence *some* review mentioned
  it at *some* point. When the only source for a deal's existence is a
  dated article and nothing current and venue-specific confirms it, that's
  grounds to delete on its own, not something to patch over with weak
  secondary signals.

If all of that holds — old/mismatched pricing, and no current special
findable anywhere — don't try to force a correction (e.g. guessing an
updated price). Delete the Special:
```
npx tsx -e "
import { prisma } from './src/lib/prisma';
(async () => {
  const deleted = await prisma.special.delete({ where: { id: '<id>' } });
  console.log('Deleted:', deleted.title, '-', deleted.venueName);
  await prisma.\$disconnect();
})();
"
```
Before deleting, check the row's comment/vote/favorite counts — zero
engagement (as in the real case) makes this an easy call; real engagement
is worth flagging to the user rather than silently deleting.

## Confirming accurate pricing isn't the same as confirming it's a "special" — delete if it isn't

Getting the price right (Case A/B territory) answers "is this data accurate
for what the venue charges." It doesn't answer a separate, earlier question:
"is this actually a deal at all?" Get Sashimi's Mixed Sashimi Poke Bowl was
priced correctly at $16.90 (fixed from a delivery-marked-up $21.90 in this
same batch) — but $16.90 turned out to just be the venue's standard,
everyday menu price, in line with what any other sashimi/poke place charges
for the same thing. No discount, no "usually $X" comparison, no
`greatValue`-style everyday-value case for exceptional quality-to-price —
just an accurately-recorded regular price with nothing special about it.

That's not a Case D staleness problem (the price is current and correct),
it's a more basic one: this should never have been posted as a lunch
special in the first place, because there's no deal — regular menu price
at ordinary value isn't a special, no matter how accurately it's recorded.
The check: does the venue's `usualPrice`/`discountPercent` fields have
anything in them, or is there a genuine "exceptional value" argument for
`greatValue`? If a "special" is really just "here's what a poke bowl
costs, same as everywhere else," delete it — the fix isn't a better price
or a better image, it's recognizing the post shouldn't exist. Same
zero-engagement check as the Case D delete flow above applies before
removing it.

## Source reliability — which sources to trust, which to skip

A batch of 10 turned up several source-quality problems that aren't about
the venue's deal at all, but about the source itself:

- **Delivery-platform prices are often marked up over the direct/venue
  price** — Get Sashimi's Mixed Sashimi Poke Bowl was $21.90 via a delivery
  aggregator but $16.90 on the venue's own Shopify store. When a price
  looks off, check whether the number you have came from a delivery
  platform rather than the venue directly, and prefer the venue's own site/
  socials/PDF menu as the authoritative price. **But this is a pattern to
  check for, not a default to assume without evidence.** Tenkomori's own
  site (tenkomori.com.au) only covers its Regent Place/Sydney CBD store —
  it says so explicitly in the footer ("contents are based on Tenkomori
  Regent Place... may vary for other shops") and its Chatswood location has
  a different menu (a vegan ramen option that doesn't exist at Regent
  Place at all). With no Chatswood-specific venue source available,
  DoorDash's Chatswood store listing was assumed to be "marked up" from an
  unrelated bulk-import price that had no actual source behind it —
  that's backwards: an unsourced number isn't more trustworthy than a
  sourced one just because it's lower. When the venue's own site covers a
  *different location* than the one you're verifying, treat it as no
  source at all for that location, not as grounds to doubt the one number
  you actually have.
- **Uber Eats (and similar) may show a bot-challenge page instead of
  content.** Don't try to solve or bypass it — treat that source as
  inaccessible and look elsewhere (the venue's own site, other aggregators,
  WebSearch summaries that already extracted pricing).
- **Instagram (and other social) posts are login-walled** via the regular
  browser tools — don't guess at what a locked post says, and don't ask the
  user for credentials (never accept passwords, for any platform). If
  **Claude in Chrome** is connected (check with `list_connected_browsers`),
  it can view these posts through the user's own already-logged-in Chrome
  session without me ever touching a password — that's the legitimate way
  past this wall, not asking for login details. If it isn't connected and
  nothing else corroborates the claimed deal, flag it to the user rather
  than editing or deleting on a hunch.
- **Unanswered "is this still on?" comments on the venue's own post are a
  strong staleness signal, arguably stronger than an old post date alone.**
  Wine Bar at The International's "Proper Lunch" Instagram post was from
  June 2025 (55 weeks old) advertising $15 pizza/$25 pasta/$10 wine — and
  had customer comments asking "Is this still on??" from 36 weeks ago *and*
  from 5 days ago, both unanswered by the venue. Combined with the current
  à la carte menu having no matching prices anywhere, that's a clear Case D
  delete, not just a "maybe check this."
- **Local-business aggregator sites (zmenu, menufyy, menu-world, etc.) can
  have flat-out wrong data for an address** — one such site's "menu photos"
  for a Vietnamese banh mi shop were actually a Chinese dim sum menu,
  clearly a mismatched/merged listing. Cross-check anything from these
  sites against at least one more source (a proper food publication, the
  venue's own socials, or multiple review sites agreeing) before trusting
  it, and don't use their photos if the content doesn't otherwise match.
- **Third-party food-blogger photos are not the same as venue-supplied
  photos.** A venue's own site/social images are the venue's own marketing
  material and fine to reuse here (as done throughout this skill). An
  independent blogger's original food photography is someone else's
  copyrighted work — don't lift it just because it's on-topic and
  accurate. If the only image available is from a review blog rather than
  the venue itself, leave the image as-is/blank rather than use it.
- **A "single dish" post can turn out to be one option in a differently
  priced rotating pool** once you check the current menu — Woolpack
  Hotel's "$19 chicken schnitzel, every day" was actually one of five
  options (schnitzel, kransky, rump steak, fish 'n' chips, lamb chops) in a
  "Daily $20 Meals" deal. This isn't quite Case C (no day-splitting needed,
  it's one pool available every day) but the fix is the same instinct: once
  you find the real current menu, update title/description/price to match
  what's actually being sold, not just patch the number you started with.
- **When a special is a rotating pool of named options (Beach Road Hotel,
  Woolpack), put every option and its actual description in the
  `description` field** — not a generic one-line summary. Beach Road
  Hotel's rotating $20 meal was first written as just "A different $20 meal
  each weekday at lunchtime" even though the source page named all four
  dishes (Smashed Burger, Caesar Salad, Rigatoni Bolognese, Rump Steak)
  *and* gave each its own ingredient description — all of which should have
  gone straight into `description`. If you've already gathered the item
  list and descriptions to confirm the special is a genuine rotating pool
  (rather than day-specific, Case C), that's a sign you have exactly what
  belongs in the description — use it, don't discard it for a vaguer
  summary.
- **Format a multi-item description with real line breaks between items,
  not one semicolon-strung sentence.** First pass on Beach Road Hotel wrote
  all four dish descriptions as one run-on sentence separated by semicolons
  — technically complete, but hard to read. The user's fix was `\n\n`
  between each item (a blank line), which reads far better, and the special
  detail page already renders this correctly since it uses
  `whitespace-pre-line` (added earlier for exactly this reason — see the
  Sydney Cidery description fix). So: one item per paragraph, separated by
  `\n\n`, the same way `src/app/specials/new/page.tsx`'s description
  textarea would if a human typed it with the Enter key — not a single
  dense paragraph, and not comma/semicolon-joined.
- **Don't name specific dishes in the `title` of a rotating-pool special —
  keep it generic (`"Weekday Lunch Special — Choice of 6 Mains"`), even
  though that looks like it contradicts "no price in title"'s advice to
  lead with something concrete.** The difference: a single-dish title names
  the *only* thing on offer, but a rotating-pool title naming 2-3 of the
  options implicitly claims those are *what's on offer* — someone searching
  for one of the other options in the pool (chicken pesto pasta, say, when
  the title only mentions schnitzel/fish and chips/burger) may skip the
  listing entirely on the strength of the title alone, even though their
  dish is right there. That's worse than a missed SEO opportunity — it's
  actively talking away a real match. The `description` field already
  carries every option's name for search matching (and often surfaces
  directly in the Google snippet when it contains the matched term), so
  nothing is lost by keeping the title generic. Separately: the classic
  pool items that come up again and again (chicken schnitzel, fish and
  chips, rump steak, burgers, pizza, pasta) are so common across pub/bistro
  lunch menus nationwide that naming them in the title barely helps
  anyway — you'd be competing on an identical phrase against thousands of
  other venues. The actual local-search differentiator is `venueName` and
  suburb, which the page's title tag appends automatically regardless of
  what `title` says — so there's little to gain and a real downside to
  cherry-picking dishes into a rotating-pool title.

## Shared steps (Cases A and B)

1. **Cross-check the existing DB row field-by-field** before assuming
   everything is wrong — often only one field is off (e.g. just the time
   window), or nothing but the image is missing. Query with a one-off
   `npx tsx -e "..."` Prisma script. Read the `description` critically too,
   not just price/day/time — Bondi Trattoria's Monday risotto description
   claimed it was a "rotating chef's risotto," but the source page only
   said that about *Tuesday's* pasta special ("A rotating special, created
   by Joe each week"); the risotto line itself had no such claim. Don't let
   phrasing from one day's item bleed into another day's description.

2. **Reuse one crop across every Special from the same source page/section.**
   Confirmed convention from the user's own entries: all 4 Clock Hotel
   specials (poke bowl, cheeseburger, schnitzel, prawn po' boy) share the
   exact same cropped image, because they all come from the same "Lunch
   Specials" block on the same page. Don't generate a separate crop per
   Special if they share a source section — check what image sibling
   Specials from the same venue/page already use first.

3. **Upload the same way the app does** (same blob store, so it behaves
   identically to user-uploaded images):
   ```
   set -a && source .env && set +a && npx tsx -e "
   import { put } from '@vercel/blob';
   import fs from 'fs';
   (async () => {
     const buf = fs.readFileSync('<path-to-crop>');
     const blob = await put('specials/<descriptive-name>.jpg', buf, { access: 'public', contentType: 'image/jpeg' });
     console.log(blob.url);
   })();
   "
   ```

4. **Decide special vs. everyday value vs. delete before writing anything,
   and re-check title/description against the formatting rules above.**
   Every single post, no exceptions: no price in the title, no generic
   "Lunch Special" title, description about the food not the venue, no
   leaked verification notes. For the price itself — a real discount keeps
   `usualPrice` set; a price that's genuinely low for the category (not
   just undiscounted) gets `greatValue: true`; a price that's merely
   average with nothing special about it gets deleted, not kept and
   labelled "Everyday Value" as a consolation.

5. **Write to the DB.** Existing Special → `prisma.special.update(...)` on
   just the fields that were wrong. New Special → follow the app's normal
   creation shape (see `src/app/specials/new/page.tsx`'s payload and the
   `SpecialSuburb`/`SpecialCategory` join rows) rather than hand-rolling a
   different shape.

6. **Verify** by re-querying the row (and/or loading the live page) — don't
   just trust that the write succeeded.

7. **Clean up** downloaded PDFs/renders from the scratchpad once confirmed.

## Gotchas learned so far

- A PDF's cover/title page is not the special — that exact mistake is what
  started this whole skill.
- The in-session browser pane cannot crop screenshots to a region — always
  drop to a local Playwright/Chromium render for anything that needs precise
  cropping.
- Don't assume every field is wrong just because one is.
- Sibling Specials from the same source often intentionally share one image
  — check before generating a duplicate crop. But this only holds when the
  siblings genuinely show the same content (e.g. one menu box listing four
  items together, Case B); a Case C venue with a different dish per day
  needs a different crop per day, not one shared image.
- A wrong post *count* (one generic post instead of seven day-specific ones)
  is a different bug from wrong post *content* — check for Case C before
  assuming a single existing post just needs its fields corrected.
- Crop bounds always take at least one iteration — guess generously, view,
  then tighten, rather than trying to nail exact pixel bounds blind.
