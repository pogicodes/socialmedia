# pogi.codes

Playful, Filipino-flavored social hub for **@pogicodes**. Goal: grow the channels. Step 1 (live): Facebook-first quick view. Next: walkable island game (Phaser) on top. See [`docs/PLAN.md`](docs/PLAN.md).

## Stack

Next.js 16 (App Router, Cache Components) · Tailwind 4 · Vercel (hourly ISR) · Teable as CMS.

## Develop

```bash
pnpm install
cp .env.example .env.local   # optional — site runs on fallbacks without it
pnpm dev
```

## Data

| What | Source | Edit where |
|---|---|---|
| Identity, intro lines, fallback levels | `src/site.config.ts` | code |
| Level name / pitch / CTA / color / order / visibility / stats | Teable `Socials` | Teable |
| Latest 3 posts per platform (non-YouTube); first Facebook reel / TikTok video is embedded (loads on tap) | Teable `Posts` (`Publishing status = Published`) | Teable |
| YouTube videos (Shorts excluded) | YouTube RSS | — |
| GitHub repos | Teable `Repos` (`Show on site`, sorted by `Order`), filled by your crawler automation. Tokenless GitHub REST "recent repos" fallback if empty or unavailable | Teable |

Everything is fetched server-side in `src/lib/data.ts` (`"use cache"` + `cacheLife("hours")`) and wrapped with fallbacks. A failing source never breaks the page.

## Env vars (Vercel → Project → Settings → Environment Variables)

- `TEABLE_API_TOKEN`: Teable personal access token with **record read** scope, limited to base `bsekboWJc9EkYrxrX6I`.
- `TEABLE_API_URL`: optional, default `https://app.teable.ai`.

## Deploy

1. Import the repo in Vercel, add the env vars, deploy.
2. Enable **Web Analytics** in the Vercel project.
3. Add domain `pogi.codes` and set the DNS records Vercel shows.
