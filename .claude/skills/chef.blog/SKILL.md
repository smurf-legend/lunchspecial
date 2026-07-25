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
16:9 for YouTube/Vimeo, a capped vertical box for TikTok, and a
min-height box for Instagram/Twitter/Facebook, since those vary in height
post to post.

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
