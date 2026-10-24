# pogi.codes — Plan

A Filipino-flavored, playable social hub for **@pogicodes**. **Sole goal: grow the channels** (follows, views, subscribes).

## Channel priority

| # | Platform | World landmark | Heal (watched ≥15s on-site / click) |
|---|---|---|---|
| 1 | **Facebook** (main) | Facebook Hall — biggest, beside spawn | Full heal **+1 golden bonus heart** (max 4) |
| 2 | YouTube | YouTube Cinema | Full heal |
| 3 | TikTok | TikTok Stage 🎤 | +2 hearts |
| 4 | Instagram | Instagram Studio | +1 (click) |
| 5 | X | X Corner | +1 (click) |
| 6 | GitHub | GitHub Dojo — secret, far end of island | +1 (click) |
| 7 | Website (blog, carlogino.com) | Blog Library — south-west islet, bridge from spawn beach | +1 (click) |
| 8 | Threads (@pogicodes) | Threads Lounge — east islet, bridge from X's X Corner | +1 (click) |

Bottom quick-link bar shows only Facebook, YouTube, TikTok, Instagram, X, GitHub (`navExclude` in `src/site.config.ts`).

Each content item heals once per session. Order drives building size/distance, HUD, Follow-all, quick view.

## Stack

- Next.js 16 (App Router, Cache Components), TypeScript, Tailwind 4, pnpm. Vercel, hourly ISR (`"use cache"` + `cacheLife("hours")`). Vercel Web Analytics.
- **Game:** Phaser 3 (Arcade Physics) + Tiled maps, client-only, lazy-loaded **after** the server-rendered quick view. React owns overlays (joystick, prompts, cards, HUD, intro).
- **Art/audio:** "Ninja Adventure" asset pack (CC0, 16×16; verify license, credit anyway) + a few custom sprites (jeepney, Pogi edit, lamok, ipis).

## Data (Teable base `bsekboWJc9EkYrxrX6I`)

| Source | Provides | Fallback |
|---|---|---|
| `Socials` (`tbl2pOxVFtf9iu05Nhs`) | Level config: `Show on site`, `Map order`, `Level name`, `Pitch`, `CTA label`, `Color`; stats when `Profile status = Retrieved` | Hardcoded levels |
| `Posts` (`tbljNSP6OoJNfgh6GOK`) | Latest 3 `Published` per platform (non-YouTube); Facebook/TikTok video URLs for embeds | Simple card |
| `Repos` (`tbl98z25vM4ao3kijj6`) | `Show on site` repos by `Order`; filled by owner's crawler automation | Tokenless GitHub REST recent repos |
| `Secret` (Step 3) | Hidden-beach message + link | Hardcoded |
| YouTube RSS `UCxcrWaR5v29dfMNtnCmp8sQ` | Latest videos, Shorts excluded | Link only |

No GitHub token. Only secret: `TEABLE_API_TOKEN` (read-only).

## Gameplay (Step 2–3)

- **World:** small top-down Philippine beach island (~20×30 tiles), coconut trees, jeepney spawn; camera follows Pogi; full-screen game viewport.
- **Pogi:** shades, slick hair, 4-dir walk, idle hair-flex ("Ang pogi ko talaga").
- **Controls:** floating joystick (4-dir snap, dead-zone) + quick-tap to walk/pathfind; desktop arrows/WASD + click-to-walk; Enter/Space interact. One-time hint "Drag to move · Tap to go".
- **Doors:** walk up into a doorway (keyboard, joystick, or tap the building) → Pogi goes straight into the building's **room**, no button press. Inside, a bouncy action hint floats above Pogi ("OPEN TREASURE 2/5?"). Room: notice board (level card: stats + CTA), up to 6 treasure chests (one per latest video / post / repo, +1 coin on first open, content + CTA in a modal), exit mat to walk back out. `?level=` deep links straight into the room with the board open. Place names live in `site.config.ts` (Teable `Level name` is ignored).
- **Guide arrow:** bouncing arrow over the next uncleared building in channel order (screen-edge arrow when off screen), then the hidden-beach chest; inside rooms it points board → unopened chests → exit.
- **Enemies (36):** lamok (zig-zag), ipis (sudden dashes); ~10 on the main island, 4–5 per islet. Slow, readable patrols. Doors are safe zones (~2 tiles). Auto-walk never stops on hit. 0.5s i-frames.
- **Hearts:** 3 (4 with golden). Hit = −1 heart, knockback, "Aray!". Heal by content (table above); FB/YT/TikTok embeds use player APIs to measure ≥15s; embeds load only on tap.
- **0 hearts → "CONTINUE?"** offering latest Facebook reel first (the "ad"). Watch 15s → revive in place, full hearts. **SKIP unlocks after a 5s countdown** → respawn at jeepney, cleared levels kept. (A play-aware countdown would need the Facebook SDK to read playback state — skipped.)
- **Coins:** ~20 on the map (some near enemies); +5 and "★ CLEARED" stamp per building engaged. HUD: `❤️❤️❤️ 🪙 12 ★ 2/6` + **Follow all** button.
- **ISLAND COMPLETE!** (all 6 cleared): confetti, jeepney horn, "Salamat, idol!", unlocks hidden beach with owner message + newest project link (Teable `Secret`). Share-your-score button.
- **Persistence:** `localStorage` (hearts, coins, cleared, position); "New game" in pause menu.
- **Copy:** mostly English UI + Taglish flavor lines ("Uy!", "Aray!", "Ayos!", "Tara, nood tayo!").
- **Pogi's idle lines (priority order):** low hearts → "watch a video to heal"; next uncleared building in channel order with a direction arrow ("Tara sa Facebook Hall! ↑"); hidden beach once unlocked; only after everything (incl. chest) → dev/creator flavor lines ("Render 99%…", "Thumbnail muna bago code.").
- **Sound:** pack SFX + chiptune, off by default, toggle remembered.

## Quick view (never lose a follower)

Server-rendered, accessible list: Facebook first; follow buttons, latest FB reel, latest YouTube video, posts, repos. It is the base page; the game enhances on top.
Auto quick view when: reduced motion (with "Play anyway"), no WebGL, very slow device, engine fails. Also what crawlers/link previews see. Manual toggle (remembered).

## Status

- ✅ Step 1 — Quick view (Facebook-first, click-to-load embeds, stats/CTA above the fold).
- ✅ Step 2 — Walkable island (Phaser 4): joystick + tap-to-walk + keyboard, doors → level cards, lamok/ipis, hearts, coins, ★ CLEARED, heal table, CONTINUE? screen, Follow all, menu, credits, Taglish lines, sound (off by default), auto quick view.
  - "Watched" = embed open & tab visible for 15s (FB/TikTok don't expose reliable progress without heavy SDKs).
- ✅ Step 3 — ISLAND COMPLETE (confetti, "Salamat, idol!"), secret bridge to the hidden beach + chest → Teable `Secret` (`tblLdewX1xlberGLnUc`), share score (native share / Facebook / X / copy), OG image rendered from the island.
- Map v3 (archipelago): main island (spawn + jeepney + Facebook Hall a few steps up the road) linked by 3-wide bridges to YouTube (W), TikTok (E), GitHub Dojo (N); Instagram via YouTube, X via TikTok; hidden beach (SE) bridge appears on ISLAND COMPLETE. Roads everywhere (auto-walk prefers them); manual steering has corner assist. Custom 16×24 Pogi (jersey + tsinelas).

## Phasing

1. **Quick view** — ship-able growth hub now (Facebook-first, embeds click-to-load).
2. **Walkable island (Game V1)** — everything in Gameplay except Step 3 items.
3. **Rewards** — ISLAND COMPLETE, hidden beach + `Secret` table, share score, custom OG.
- **V2:** Kapre & Duwende, sari-sari store (spend coins on cosmetics), rice terraces, custom Pogi sprite of owner, more areas.

## Non-code cleanup

- Fix stale `codegino` refs in YouTube bio and GitHub profile.
- Re-check Facebook `Socials` row (scrape unavailable).
