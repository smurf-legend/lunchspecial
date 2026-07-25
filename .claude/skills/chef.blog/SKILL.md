---
name: chef.blog
description: Write a Table Talk blog post (BlogPost model — title/excerpt/body) for the LunchSpecial site, especially opinion/roast pieces about Sydney food-influencer culture. Covers research process for a real person/account, the funny-but-not-defamatory line, and the plain-paragraph body format ArticleBody actually renders. Use when asked to write, draft, or post a Table Talk article.
---

# Writing a Table Talk post

Table Talk posts are the `BlogPost` model (`prisma/schema.prisma`): `title`,
`slug`, `excerpt` (short summary for the list view), `body`, optional
`imageUrl`, `hidden`, `publishAt`. Created via `/kitchen/table-talk/new`,
same admin-author convention as Specials (see `verify-special-source` — the
`team@lunchspecial.com.au` account is the usual author for house content).

## Preview and scheduling (BlogForm)

`BlogForm` (`src/components/BlogForm.tsx`) has an Edit/Preview toggle at
the top — Preview renders the actual title/byline/cover image/`ArticleBody`
using live form state, so embeds and images show for real before saving.
It also has a three-way "Publishing" control (publish now / save as draft /
schedule for later) instead of a plain hidden checkbox. Scheduling sets
`publishAt` to a future timestamp; visibility is derived from it at read
time the same way `Special.expiresAt` drives `isExpired` — no cron job,
see `isScheduled`/`formatScheduled` in `src/lib/postStatus.ts`. A
scheduled post 404s for non-admins and shows an admin-only banner
(`table-talk/[slug]/page.tsx`) until its time passes, then it appears in
`/table-talk` automatically. Listings sort by `publishAt ?? createdAt` (see
the comment in `table-talk/page.tsx`) so a post scheduled for next week
doesn't look stale the moment it finally goes live — its "date" is when it
actually became visible, not when the row was created.

When testing this admin-only flow, remember logging into an admin account
requires a password — that's the user's action to do themselves, not
something to script around (not even with a throwaway test account
created for verification — same rule applies). Verify what's reachable
without auth instead: create test `BlogPost` rows directly via a
`prisma.blogPost.create` script covering the states you need (published
now / scheduled future / hidden draft), hit `/table-talk` and
`/table-talk/<slug>` as the current (non-admin) browser session to confirm
listing/gating behavior, then delete the test rows.

## Body format is plain paragraphs, not markdown

`ArticleBody`/`parseArticleBlocks` (`src/lib/articleBlocks.ts`) splits the
body on blank lines. Each block is either a plain paragraph, a lone
`![alt](url)` line (renders as an image), or a lone URL from a supported
platform (renders as a live embed). **There are no headers, bold, or
lists** — a `##` or `**` will render literally as those characters, not
formatting. So:

- Punchy short paragraphs do the job headers would in a normal blog —
  don't write one the way you'd write for a markdown renderer.
- If a real image is warranted (e.g. a venue's own photo, same sourcing
  rules as `verify-special-source`), drop it on its own line as
  `![alt text](https://blob-url)`.
- When drafting in chat for the user to review before posting, it's fine to
  use chat markdown (bold title, etc.) for readability — just don't carry
  that formatting into the actual `body` string that gets written to the DB.

## Embedding a social post instead of ripping the image

Prefer embedding the actual post over downloading/re-hosting someone's
photo — especially for a piece that's critical of the account being
written about, where using their own portrait as your hero image reads
badly on top of the copyright exposure. A bare post URL on its own line
(surrounded by blank lines, same as any block) renders as a live embed via
`socialEmbedUrl()` in `articleBlocks.ts`, which supports YouTube, Vimeo,
Instagram (`/p/` and `/reel/`), X/Twitter (`/status/`), TikTok
(`/@user/video/`), and Facebook. All six resolve straight to that
platform's own iframe embed URL — no external `<script>` tag needed, so it
works the same way the pre-existing YouTube/Vimeo embed did. Confirmed
working end-to-end against a real Instagram post (renders live, pulls
current avatar/caption/attribution straight from Instagram — not a copy).
`ArticleBody` sizes the container per platform (`embedContainerClass`):
16:9 for YouTube/Vimeo, a capped vertical box for TikTok, and a fixed
720px box for Instagram/Twitter/Facebook (a bare iframe src never gets the
resize postMessage real embed.js would send, so it needs a generous fixed
height, not a min-height — a min-height doesn't work because the iframe's
`h-full` can't resolve a percentage against a parent whose height is only
a minimum, so it silently collapses and clips instead of growing).
Instagram specifically uses the `/embed/captioned` path — the plain
`/embed` path renders a bare, resize-dependent card, where `/embed/captioned`
is self-contained and ends cleanly (header → media → "View more on
Instagram") without needing JS-driven resizing at all.

**The cover photo field (`imageUrl`) is different from an embed — it needs
a real static image file, not a post/profile page URL.** Pasting an
Instagram link into the cover photo field renders a broken image, since
`imageUrl` goes straight into an `<img src>`, not an iframe. If a
Playwright/Chromium screenshot isn't available (e.g. its cached browser
binary is missing and reinstalling is a sizeable download not worth doing
mid-task) and Claude in Chrome's `save_to_disk` screenshot option doesn't
land anywhere the Bash tool can reach, there's a reliable no-browser
fallback for grabbing a real image: reload the target page with Claude in
Chrome, then `read_network_requests` filtered to the platform's CDN domain
(e.g. `cdninstagram`) — the actual photo/avatar files show up as direct,
signed CDN URLs (`scontent.cdninstagram.com/...`) that `curl` can fetch
directly, no page render needed. Instagram serves multiple sized variants
of the same profile picture; the one with a `stp=dst-jpg_s150x150_tt6`-style
query param is a small downsized crop, while a same-photo request without
that param (look for a second network request for a similarly-named file,
often a `t51.2885-19` path) is the full-resolution original (1080×1080 in
practice) — don't hand-edit a signed URL's query string to strip the size
param yourself, it breaks the request signature; find the CDN's own
already-larger variant among the other logged requests instead. For an
account's own logo/avatar specifically (as opposed to a specific post's
photo), this is often a better and safer cover-image choice than any
individual post photo anyway — it's the account's own public brand asset
rather than a photo of the person, sidestepping the portrait-as-hero-image
concern entirely.

When testing a new embed while writing a post, create the draft via a
one-off `prisma.blogPost.create` script (same pattern as
`verify-special-source`'s DB scripts), view it at `/table-talk/<slug>`,
then delete it once confirmed — don't leave test posts sitting in the
live table.

## Researching a real person/account before writing about them

This came up first for a roast piece about a specific Sydney food
influencer (Places in Sydney / Adrian Widjonarko). The research process:

1. **Get the real identity and verifiable facts first** — real name,
   follower count, who else runs the account, and, critically, their
   **monetization footprint**: Linktree, About page, discount codes,
   affiliate storefronts. This is usually public, self-disclosed, and
   completely fair game — it's the account's own "About Us" page and their
   own link-in-bio, not a private fact being exposed.
2. **The in-session Chrome tools (`mcp__claude-in-chrome__*`) may be flaky**
   (navigate/get_page_text timing out) — don't block on them. WebSearch +
   WebFetch against influencer-directory writeups (Favikon, Food Inbox,
   Modash, etc.), the subject's own Linktree, and their own About/website
   page is usually enough to ground a piece without ever loading Instagram
   directly. If Chrome does work, a firsthand scroll of the actual grid is
   still the better source — flag to the user when the piece was written
   without it, so they can sanity-check before publishing.
3. **A Google AI Mode share link (`share.google/aimode/...`) 302s** to a
   generic search results page, not the original AI answer — WebFetching it
   directly won't recover the content. Treat it as a dead end and go
   straight to WebSearch on the subject's name/handle instead.

## Voice: write for an Aussie audience

Table Talk should read distinctly Australian, not generic internet-snark
— confirmed from the user's own hands-on edits to the first piece:

- **Regional self-deprecation beats a specific local address.** "A hole in
  Wagga Wagga" landed better than "the Ibis on George Street" as the
  second half of the "a bus stop qualifies" joke — Wagga Wagga is a
  shared, affectionately-mocked national "middle of nowhere" reference
  that lands instantly, where a specific Sydney street needs the reader to
  already know that street.
- **Idiom, twisted against the subject, beats a straight description.**
  "An ad with his stupid surprised face like he just discovered sliced
  bread" turns "best thing since sliced bread" into a visual jab, and
  does more work than just calling the post an ad.
- **Blunt, unfussy physical humour is a deliberate, occasional tool — not
  a running bit.** "Not even a little bit of food poisoning. The
  occasional diarrhoea would definitely make us believe his reviews had a
  drop of authenticity" is a full notch cruder than the rest of the piece,
  and the user flagged it themselves, unprompted, as the one line most
  likely to draw a complaint. That's the right amount of self-awareness to
  have about a line like this: one per piece at most, chosen deliberately,
  not reached for by default.
- **Undercut your own authority at the close.** The piece ends "Actually
  we could be wrong, maybe someone wrote 'this bus stop sucks' at a bus
  stop. :)" — a callback to the opening joke that deliberately walks back
  the confidence of everything just said. That "eh, we might be talking
  nonsense" shrug is what keeps a piece that's been cutting the whole way
  through reading as a joke among mates rather than a takedown — which
  also does real work for staying on the right side of the
  funny-but-not-defamatory line below, not just tone.

## The funny-but-not-defamatory line

The brief for the first post was explicitly "he's a sell out, call him out,
be funny" — that's a legitimate opinion-journalism angle (plenty of real
food media runs "why does every influencer review say everything is
amazing" pieces), but it only stays safe to publish about a real,
identifiable person if the sharpest claims are handled as **opinion tied to
a cited fact**, not as **assertions of fact you can't back up**:

- "It's hard not to wonder if a rave review is an opinion or a placement,
  given the discount code sitting right below it" — fine. It's commentary
  on a real, sourced fact (an actual discount code with his name on it).
- "He's been paid to lie about every review" — not fine. That's a specific
  factual accusation about undisclosed paid bias with zero evidence behind
  it, and is the version that's actually defamation risk, not just spice.
- Similarly, "we couldn't find a single negative review" should be framed
  as *our* search coming up empty / a dare to commenters to find one — not
  as "he has never once in his life said anything negative," which is a
  specific factual claim about the account's entire history that almost
  certainly hasn't been exhaustively checked.

Roast the business model (affiliate links, sponsorship codes, the
incentive structure), the branding (a handle as generic as "Places in
Sydney"), and the genre (influencer reviews that are always positive) —
all fair, all grounded. Don't invent specific incidents, quotes, or paid
arrangements that weren't actually found in research.

## Don't auto-publish

Draft in chat and let the user read it first unless they've explicitly said
to post directly — this was the instruction on the first post and is a
reasonable default for anything that roasts a named, real person, given the
reputational stakes are higher than a Special listing.
