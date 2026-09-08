# OpenAI Booster Packs Collector Simulator

A Three.js collectible-card experience, now featuring Series 001 of the OpenAI Builders fan edition. Drag across a foil seal, peel open a pack, and discover five illustrated builders one at a time. Cards have physical thickness, rounded corners, a printed back, and interactive tilt. Reverse holographic, holographic, and gold finishes use a view-dependent shader.

## After-hours room

The full background is a Three.js room with walnut furniture, a sofa and cushions, plants, a record player, shelves, warm pendant lights, lilac and cyan neon tubes, and fairy lights. A procedural window shader shows a rainy city at night. The foreground desk includes a mug with subtle steam, a playmat, and spare cards. Room geometry receives colored light and static shadows, with drag-to-explore camera movement that eases back on release.

The upper-right shelf displays an extruded OpenAI Blossom ornament, built from the official SVG. Source details are in [OPENAI-LOGO.md](src/assets/OPENAI-LOGO.md).

The room and the interactive cards share one WebGL renderer. Separate camera passes keep the original card controls aligned while filling the entire browser with the room. Rain, steam, and parallax honor reduced-motion preferences.

## Run

```sh
npm install
npm run dev
```

Open [the pack room](http://localhost:5198). `npm run build` creates a production build in `dist/`; `npm run preview` serves it. `npm test` checks pack generation, anonymous sessions, collection persistence, and concurrent requests. Local development requires Node.js 22.13 or newer and saves to the ignored `.data/collections.sqlite` file.

The app uses a single root page at `/`, with ordinary random packs. Packs are generated on the server; query parameters do not force particular pulls.

## The experience

- Drag the room background to explore slightly left, right, up, or down; release to return to the original view. Pack and card gestures take priority.
- Grab anywhere near the top of the pack and drag either way. A padded grab area and shorter pull make the seal easy to catch. Partial tears remain open so you can release and resume. The detached strip curls away before both sides of the wrapper fall away.
- The sealed pack keeps only its top tear hint; card-progress dots appear once the wrapper opens.
- Tap a face-down card to reveal it, then drag to tilt it. Release to let it settle. Tap the revealed card when ready for the next; tapping the final card shows your pulls.
- Open **Collection** to filter by finish and inspect any revealed card. The inspection view also offers **Flip card**.
- **Enter / Space** open, reveal, and advance. **Arrow keys** tilt. **M** toggles sound. **Escape** closes dialogs or inspection.
- Sound is synthesized with Web Audio after a user gesture: foil crackles respond to dragging, cards swish, and rare reveals play a layered chime. No external audio assets are required.
- Reduced-motion system preferences shorten the transitions and disable ambient motion and reveal particles. Mouse, touch, and pen share pointer-event handling.

## Cards and odds

Each anonymous player starts with **three free packs**. After the third pack, **Follow me on X** opens [@itssotsot](https://x.com/itssotsot) in another tab and starts a **five-second** spinner. The app then grants **1,000 extra packs once per anonymous player**, whether or not the visitor follows. Existing followers use the same button. This is a timed thank-you gift; it does not call X's API, authenticate users, or verify follows.

The server saves the balance, timer deadline, and collection. An opaque HttpOnly cookie identifies the player automatically: there is no sign-in or recovery code. Returning in the same browser restores the collection and allowance. Clearing the cookie or using another browser creates a separate player and loses access to the previous save. The bonus does not prove a follow or prevent someone creating another anonymous player. `src/pack-access.js` contains the creator URL, allowance, and timer configuration.

Existing local collections and allowances are imported once when this browser first connects to the database. This compatibility import is not an anti-cheat boundary. The original local save remains as a backup; subsequent gameplay uses the database. Failed saves stop the affected action and show an error rather than pretending progress was saved.

30 publicly sourced OpenAI people, four finishes, and 120 collectible variants. Each five-card pack has five different people. Cards 1–4 have a 64% standard / 25% reverse holo / 10% holographic / 1% gold rare distribution. The last card is 99% holographic / 1% gold rare.

Starting a tear requests a server-generated pack while the gesture continues. One atomic operation deducts the pack and grants all five cards immediately, including duplicates. Reveals and next-card transitions run entirely locally, with no network calls. If the server is unusually slow, the first card still waits for the pack response; subsequent reveals never wait for saving. Failed requests retry with the same receipt ID to avoid double charging.

Reloading does not resume a reveal sequence: all five cards are already in the collection. The migration also grants any remaining unshown cards from an old unfinished pack without adding already-revealed cards twice. This is a free collection experience with no purchases, trades, or battle system.

## Sites database

`.openai/hosting.json` declares the D1 binding `DB` for the existing Sites project. The Worker API is built to `dist/server/index.js`, the client to `dist/client`, and Sites metadata and SQL migrations are included in the build. `db/schema.ts` defines the tables; run `npm run db:generate` after schema changes and review the generated migration before deployment. Do not edit already-applied migrations.

Local development and preview use SQLite through the same API. The deployed Worker uses Sites D1 and stores only a hash of each secret session cookie. `users` stores anonymous IDs, dates, allowance counters, and bonus status. `card` stores one row for every owned copy, with person, finish, acquisition date, and pack/slot where known. `pack_openings` stores a request receipt for safe retries, not reveal progress. A transactional batch commits the receipt, five card rows, and pack debit together. Imported legacy cards retain the available save timestamp because their original acquisition dates were not recorded. The hosted database and migration take effect on the next Sites deployment; running a local build does not modify the live site.

## Artwork

The new portrait strips and wrapper were generated with the built-in image generation tool using public portrait references. Exact prompts and layouts: [BUILDERS-ARTWORK.md](public/assets/BUILDERS-ARTWORK.md). Research and account sources: [BUILDERS-SOURCES.md](public/assets/BUILDERS-SOURCES.md). Card lettering, frames, and backs are canvas textures; the wrapper uses generated art on deformable Three.js geometry. The cozy 3D room remains intact.

The current wrapper replaces the bottom-right portrait with Peter Steinberger, keeping Sam, Tibo, and the existing composition. The original wrapper is retained as `builders-pack.png`; the active image is `builders-pack-peter-v2.png`. The room's left side is clear of promotional copy, and the collection bar aligns with the bottom of the window.

The expansion appends 21 people (including Andrew Ambrosino) while preserving the first nine card identities and existing saves. Fictional abilities and stats are marked as fan-edition game content. The legacy `rift.builders.collection.v1` collection is eligible for the one-time database import; the older `rift.collection.v1` data is never reinterpreted as people cards.

## Verification

See [tests/QA.md](tests/QA.md) for browser checks and known verification limits. The automated suite tests 10,000 reproducible packs, rarity distributions, uniqueness, save validation, and corrupted or unavailable storage. Seeded pack generation remains available to automated tests only.

The renderer uses Three.js [physical materials](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) for the wrapper and a custom GLSL finish shader for cards. The app requires a browser with WebGL and uses Google Fonts when available, with local font fallbacks.
