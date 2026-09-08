# OpenAI Booster Packs Collector Simulator

A Three.js collectible-card experience, now featuring Series 001 of the OpenAI Builders fan edition. Drag across a foil seal, peel open a pack, and discover five illustrated builders one at a time. Cards have physical thickness, rounded corners, a printed back, and interactive tilt. Reverse holographic, holographic, and gold finishes use a view-dependent shader.

## After-hours room

The full background is a Three.js room with walnut furniture, a sofa and cushions, plants, a record player, shelves, warm pendant lights, lilac and cyan neon tubes, and fairy lights. A procedural window shader shows a rainy city at night. The foreground desk includes a mug with subtle steam, a playmat, and spare cards. Room geometry receives colored light and static shadows, with gentle pointer parallax.

The upper-right shelf displays an extruded OpenAI Blossom ornament, built from the official SVG. Source details are in [OPENAI-LOGO.md](src/assets/OPENAI-LOGO.md).

The room and the interactive cards share one WebGL renderer. Separate camera passes keep the original card controls aligned while filling the entire browser with the room. Rain, steam, and parallax honor reduced-motion preferences.

## Run

```sh
npm install
npm run dev
```

Open [the pack room](http://localhost:5198). `npm run build` creates a production build in `dist/`; `npm run preview` serves it. `npm test` checks pack generation and collection persistence.

The app uses a single root page at `/`, with ordinary random packs. An optional `?seed=1` makes the sequence repeatable for previews.

## The experience

- Grab anywhere near the top of the pack and drag either way. A padded grab area and shorter pull make the seal easy to catch. Partial tears remain open so you can release and resume. The detached strip curls away before both sides of the wrapper fall away.
- The sealed pack keeps only its top tear hint; card-progress dots appear once the wrapper opens.
- Tap a face-down card to reveal it, then drag to tilt it. Release to let it settle. Tap the revealed card when ready for the next; tapping the final card shows your pulls.
- Open **Collection** to filter by finish and inspect any revealed card. The inspection view also offers **Flip card**.
- **Enter / Space** open, reveal, and advance. **Arrow keys** tilt. **M** toggles sound. **Escape** closes dialogs or inspection.
- Sound is synthesized with Web Audio after a user gesture: foil crackles respond to dragging, cards swish, and rare reveals play a layered chime. No external audio assets are required.
- Reduced-motion system preferences shorten the transitions and disable ambient motion and reveal particles. Mouse, touch, and pen share pointer-event handling.

## Cards and odds

30 publicly sourced OpenAI people, four finishes, and 120 collectible variants. Each five-card pack has five different people. Cards 1–4 have a 64% standard / 25% reverse holo / 10% holographic / 1% gold rare distribution. The last card is 99% holographic / 1% gold rare.

Revealed cards and pack counts save to this browser’s local storage. Unrevealed cards in an unfinished pack do not persist through a reload. Duplicate cards increase the owned count. If storage is unavailable, the game continues in memory and displays a notice. This is a free local collection experience, with no accounts, purchases, trades, or battle system.

## Artwork

The new portrait strips and wrapper were generated with the built-in image generation tool using public portrait references. Exact prompts and layouts: [BUILDERS-ARTWORK.md](public/assets/BUILDERS-ARTWORK.md). Research and account sources: [BUILDERS-SOURCES.md](public/assets/BUILDERS-SOURCES.md). Card lettering, frames, and backs are canvas textures; the wrapper uses generated art on deformable Three.js geometry. The cozy 3D room remains intact.

The current wrapper replaces the bottom-right portrait with Peter Steinberger, keeping Sam, Tibo, and the existing composition. The original wrapper is retained as `builders-pack.png`; the active image is `builders-pack-peter-v2.png`. The room's left side is clear of promotional copy, and the collection bar aligns with the bottom of the window.

The expansion appends 21 people (including Andrew Ambrosino) while preserving the first nine card identities and existing saves. Fictional abilities and stats are marked as fan-edition game content. The collection is stored separately under `rift.builders.collection.v1`; the old `rift.collection.v1` data is retained and never reinterpreted as people cards.

## Verification

See [tests/QA.md](tests/QA.md) for browser checks and known verification limits. The automated suite tests 10,000 reproducible packs, rarity distributions, uniqueness, save validation, and corrupted or unavailable storage. Use [seed 1](http://localhost:5198/?seed=1) for a repeatable visual test; omit the query for ordinary random packs.

The renderer uses Three.js [physical materials](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) for the wrapper and a custom GLSL finish shader for cards. The app requires a browser with WebGL and uses Google Fonts when available, with local font fallbacks.
