# LunchSpecial — Sydney lunch specials, crowdsourced

An OzBargain-style community platform, but for lunch specials: users post
what's on at their local cafe/restaurant, others upvote, comment, and browse
by suburb or cuisine. Starting in Sydney, structured to scale to other cities.

## Stack
- Next.js 14 (App Router, TypeScript)
- Prisma + PostgreSQL
- NextAuth (email/password credentials)
- Tailwind CSS

## Data model
- **Suburb** — seeded with 10 inner-Sydney suburbs to start (`prisma/seed.ts`).
  Adding a new city later is inserting rows, not a schema change.
- **Special** — the lunch special itself: venue, suburb, price (special +
  optional "usual price" for a discount comparison), which days it runs,
  and a time window.
- **Category** — cuisine/meal-type tags (Asian, Cafe, Pub Food, etc.)
- **Vote**, **Comment** — same mechanics as any OzBargain-style feed:
  one vote per user per special, threaded comments.

## What's built
- Post a lunch special (`/specials/new`) — venue, suburb, price, days
  available, cuisine tags
- Detail page with voting and threaded comments (`/specials/[id]`)
- Home feed filterable by suburb and cuisine, sortable Hot/New
- Suburb landing pages (`/suburbs/[slug]`) — useful for SEO, since
  "lunch specials in Surry Hills" is exactly the kind of search term
  this kind of site lives on
- Login/register, search bar

## What's NOT built yet (next steps)
- Google AdSense integration — see note below
- Image upload for special/venue photos
- Moderation tools (flagging stale/incorrect specials, deleting)
- Auto-expiry for specials that haven't been confirmed in a while
  (lunch specials go stale faster than typical deals)
- Pagination UI (API supports `?page=`, feed only renders page 1)
- Expansion beyond Sydney (add rows to the Suburb table + seed script)

## On the OzBargain model and ad income
OzBargain's traffic comes from being useful and current — people check it
because the deals posted are genuinely fresh and locally relevant. Google
AdSense approval requires original content and an established posting
history; it isn't automatic, and payout depends entirely on traffic volume,
which takes time to build. Worth treating "get to consistent posting volume
in Sydney" as the actual first milestone rather than ad revenue itself —
the traffic is the hard part, the ads are the easy part once you have it.

When you're ready to add ads, Google AdSense is the standard fit for this
model — sign up at google.com/adsense once the site has some real content
and traffic, then a small script snippet goes in `layout.tsx`.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Get a free Postgres database (pick one):
   - [Neon](https://neon.tech) (recommended, generous free tier)
   - [Supabase](https://supabase.com)

3. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — your Postgres connection string
   - `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev

4. Run migrations and seed Sydney suburbs + sample data:
   ```
   npx prisma migrate dev --name init
   npm run seed
   ```

5. Start the dev server:
   ```
   npm run dev
   ```
   Visit http://localhost:3000

   Demo login: `demo@lunchspecial.com.au` / `password123`

## Deploying
- Push to GitHub, import into [Vercel](https://vercel.com)
- Add the same env vars in Vercel's project settings
- Point `DATABASE_URL` at your production Postgres instance
- Point the domain (e.g. lunchspecial.com.au) at Vercel via its custom
  domains settings once purchased through a registrar
