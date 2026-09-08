# Browser verification — 8 September 2026

Verified against the running local Vite app in the Codex browser. The browser session uses ordinary visible controls; seeded packs only make the visual checks repeatable.

| Journey           | Check                                                           | Result                                                                                                                   |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Launch            | Desktop 1280 × 720 and initial 1266 × 714                       | Original wrapper, opening controls, and card world render. Short-window layout refined so the footer remains visible.    |
| Manual opening    | Partial left-to-right drag, release, resume                     | Progress persists, strip curls, second drag completes the tear.                                                          |
| Reverse direction | Right-to-left drag at 390 × 844                                 | Opens the pack and reveals the first card. This is a pointer drag in a mobile viewport, not a physical touchscreen test. |
| Click alternative | Open button, automatic rip and peel                             | All transitions reach the first face-down card.                                                                          |
| Full pack         | All five reveals with seed 1                                    | Standard, holographic, reverse holo, and gold rare are displayed; all five appear in the haul.                           |
| Card tilt         | Pointer drag and arrow-key tilt                                 | Card rotates; active card moves ahead of the stack to avoid intersection. Holographic gradients follow the angle.        |
| Inspection        | Open a haul card, flip to back                                  | Printed back renders; return restores the haul.                                                                          |
| Collection        | Open from an in-progress pack and haul, filter by gold rare     | Counts, duplicate quantities, matching variants, and previews are correct.                                               |
| Navigation        | Open collection from inspection; leave inspection during a flip | Returns correctly without stale meshes or console errors.                                                                |
| Persistence       | Refresh / source reload, reopen collection                      | Revealed cards and duplicate counts remain.                                                                              |
| Mobile            | 390 × 844, opening room, reveal, collection, help               | No horizontal overflow. Labels and illustrations do not overlap. Footer is reached by normal vertical scrolling.         |
| Browser logs      | After complete playthrough and inspection navigation            | No warnings or errors from the app.                                                                                      |

Additional checks: the compiled production build completed an opening and reveal without browser errors; the sound button and M key correctly toggle the displayed mute state. An 844 × 390 landscape viewport has no horizontal overflow and uses vertical scrolling.

The automated Node tests separately cover 10,000 packs, rarity distribution bounds, duplicate-free species, deterministic seeds, corrupt saves, validation, and blocked storage.

Physical-device touch, subjective speaker/headphone sound quality, and real-device reduced-motion settings have not been independently verified. Pointer handling, audio envelopes, and reduced-motion branches are implemented. No claim of a production deployment is made.

## After-hours room update

Checked the full-window room at desktop size and 390 × 844: window, sofa, lighting, desk, and warm translucent UI are visible. The card stage remains aligned after scrolling. A manual partial tear can be released and resumed; opening, reveal, arrow-key tilt, holographic effects, and the collection dialog continue to work. Test pulls use the localhost origin so the user collection on 127.0.0.1 is preserved.

A missing closing brace in the initial rain shader was found during visual testing and corrected before completion. The final room is built from geometry; the city and rain inside the window use a procedural shader.

The final compiled build was checked in a clean browser tab at 1280 × 720: one full-window canvas, no horizontal overflow, and no browser warnings or errors. Temporary viewport overrides and the production preview server were cleaned up; the development game remains available on port 5198.

## Builders edition — 2026-09-08

- Built-in image generation created three portrait strips (nine referenced public people) and a new wrapper illustration. All nine card crops and generated portrait images loaded successfully in the gallery.
- Desktop browser QA at 1280×720 on the separate `localhost:5198/?seed=1` origin: partial drag tear held its progress and the finish-opening button completed the rip. All five cards revealed, counted, and appeared in the saved collection.
- The seeded pack produced Romain Huet / standard, Noam Brown / holographic, Michelle Pokrass / standard, Greg Brockman / reverse holo, and Dimillian / gold rare. Inspected the live foil sheen, dragged a holographic portrait, and flipped the gold card from the collection to its new Builders back.
- Public profile and biography-source anchors were inspected in the DOM for all nine roster entries. No direct X browsing or authenticated X actions are required by the app.
- Phone viewport 390×844: wrapper readable, roster button available, two-column gallery fits, all nine images decoded, document scroll width equals viewport width. Collection persisted across reload (5 unique cards, 1 pack). Viewport reset and QA tab closed afterward.
- No browser warning/error logs in the tested flow. Existing audio code and cozy-room geometry are unchanged; this visual update does not claim a new recorded audio review.
- `npm run check`: all five tests pass, including 10,000 random packs and isolation of the new save key from the legacy creature collection. Production build succeeds with the existing Three.js chunk-size advisory.

## Builders expansion — 2026-09-08

- Added 20 researched people plus Andrew Ambrosino (@ajambrosino), for 30 people and 120 collectible variants. Five 2×2 portrait sheets and one single portrait were generated, inspected, and saved in `public/assets/`. The wrapper, original nine portraits, sound implementation, and room geometry are retained.
- Seven automated tests pass. The suite covers 10,000 randomized packs, rarity distributions, unique people, saved-card validation, stable original identities, existing saves, and unique valid portrait cells for every person. The production build passes with the existing 534 kB Three.js chunk advisory.
- Desktop browser at 1280×720, `localhost:5198/?seed=971`: opened and revealed all five cards (Wojciech Zaremba / reverse holo, Gavin Nelson / holographic, Peter Welinder / reverse holo, Peter Steinberger / reverse holo, Andrew Ambrosino / gold rare). All five were added to the existing five-card test collection. Andrew's illustrated gold card, name, @handle, and #030 index match.
- Collection shows the original five saved cards alongside the five new ones. Andrew's card opens in the 3D inspection view and flips to the printed Builders back. Reload preserves 10 unique cards and 2 opened packs.
- Gallery contains exactly 30 named entries. Name search, @handle search, no-match messaging, and clearing the search were exercised. Andrew's and Hyung Won Chung's portrait crops and public profile links were inspected in the mobile layout.
- Phone viewport 390×844: gallery, search, full portrait card, biography, and source link fit; document scroll width equals viewport width. This is a browser viewport check, not physical-device touch QA. Temporary viewport override reset afterward.
- No browser warnings or errors in this flow. Test pulls stayed on the separate localhost origin; the user's 127.0.0.1 collection was not altered by QA. No new subjective audio review or deployment is claimed.

## Rounded holo corners — 2026-09-08

- Inspected the user's Tibo reverse-holo card. The rounded mesh enclosed a square inner printed frame, while the foil shader used a rectangular edge band with a different width.
- Card faces and thickness now use circular corner arcs. A shared corner radius drives the rounded printed frame and the foil's antialiased distance mask, with the same 9-pixel frame width. The printed back's border follows the curve too.
- Browser check with seed 1570: Tibo / reverse holo, Peter Welinder / holographic, and Shibani Santurkar / gold rare all show continuous rounded borders. Drag and keyboard tilt keep the finish aligned with the card's edge. All five cards in the test pack reveal normally.
- Seven tests and the production build pass; no browser shader errors or warnings. Temporary viewport override reset and test tab closed after checking.

## Clear room layout — 2026-09-08

- Removed the left promotional heading, supporting copy, room label, and extraordinary caption, including their state-update code. Moved the inspection back button into the card details panel.
- Removed the room height cap and made the page a column layout. At 2085×1222 and 1280×720, the footer's bottom exactly matches the viewport height. At 390×844, the footer also ends at 844px with no horizontal overflow.
- Tested all five reveals and the haul view on mobile. Inspection navigation remains available, and the inspected card sits above its controls. The left copy stays absent through reveal, summary, and inspection.
- Production build succeeds. No new tests were added for this presentation change.

## Peter Steinberger wrapper — 2026-09-08

- Edited the original 1024×1536 wrapper with the built-in image generator, using Peter's inspected public portrait as the likeness reference. Visually compared Sam, Tibo, the jade background, and the iridescent oval with the original; Peter replaces Dimillian at bottom right.
- Saved `public/assets/builders-pack-peter-v2.png` and updated the image loader. The original `builders-pack.png` remains available. Exact edit prompt and input references are recorded in `BUILDERS-ARTWORK.md`.
- Verified the final artwork on the rendered foil pack in the browser. All three faces fit beneath the existing lettering; Peter is correctly positioned at bottom right. A preview load initially stalled, then completed after a reload. No code change was needed for that transient delay.
- Production build passes. Layout cleanup remains present with the left side clear and the collection bar at the bottom.

## First series — 2026-09-08

- Set the shared series value to `001`, used by the wrapper lettering, card backs, pack details, and builders gallery.
- Verified the rendered wrapper and pack details both show Series 001 in the browser. The production build passes.

## Easier pack tearing — 2026-09-08

- The upper third of the pack accepts grabs with 32px of side padding (44px for touch pointers) and 48px above the seal. The cursor uses the same target. Initial drag direction chooses the tear direction; later grabs can resume in either direction without reversing the existing tear.
- Pull distance is half the displayed pack width, bounded to 100–220px. A 6px movement threshold avoids treating pointer jitter as a pull. Updated the hint, guide, and interaction copy.
- On an isolated preview origin, verified that dragging the lower pack does nothing, grabbing above the middle starts a tear, and resuming from the middle in the opposite direction opens the pack. Card reveal still works.
- At 390×844, grabbed 20px outside the upper-right side and opened with a short leftward drag. This checks the phone layout with a mouse, not physical touch input. No browser errors or warnings; seven tests and the production build pass. Restored the viewport and closed the isolated preview afterward.

## Minimal opening view — 2026-09-08

- Removed the fresh-pack caption, opening button, lower helper text, and bottom-right edition label. The bottom card controls stay hidden until the first card is ready, including when returning from collection inspection. Keyboard opening remains available through Enter / Space.
- Verified the clean view in the active preview. On the separate test origin, opened by dragging, revealed all five cards, viewed the haul, and started another pack. The new pack again has empty caption/helper content and hidden controls, with no edition label.
- Production build passes; no browser errors or warnings. Closed the test preview and stopped its temporary server.

## Rarity panel and card taps — 2026-09-08

- Replaced the pack details with the rarity breakdown. The footer legend and bottom-right link are removed, along with the two former panel buttons. The odds panel fits beside the pack on desktop and below it in two columns at 390×844.
- Clicking a card back reveals it; clicking a revealed card advances. Verified all five cards by clicking their surfaces, including the final click into the haul. A drag tilts without advancing. Removed the ordinary reveal caption and verified its empty element has zero height.
- Card 5 now has 99% holographic / 1% gold odds. The generator, panel, and help text share the final gold percentage. Eight tests pass, including the 10,000-pack distribution check and an exact 1% final-slot check across 1,000 evenly spaced rolls. Production build passes.
- Browser shows 99% / 1% in the panel and help, with no warnings or errors. Test pulls used the separate preview origin. Restored the viewport, closed the test tab, and stopped the temporary server.

## Cards without action buttons — 2026-09-08

- Removed the card action button and both surrounding text elements, including all state-update references. Card-progress dots remain. Verified all five reveals and advances by clicking card surfaces through to the haul; no browser warnings or errors.
- Removed the canvas-rendered `Rift / Fan Edition` line above OpenAI on the wrapper and inspected the updated pack in the active preview. Production build passes. The isolated test tab is closed and its temporary server stopped.

## Guaranteed Tibo Gold Rare route — 2026-09-08

- `/tibo-gold` and `/tibo-gold/` reserve Tibo for the fifth slot in Gold Rare. Four other builders are sampled without replacement using the normal first-four finish odds. The root route keeps the original random sequence and final-slot probabilities.
- The special route's odds panel and guide show Tibo / 100% Gold Rare. Starting another pack retains the route. Collection storage is shared with the ordinary pack room on the same origin.
- Ten tests and the production build pass. The new generator test checks 10,000 special packs for the guaranteed final card, unique people, all 29 other builders remaining available, and the ordinary finish distribution. A fixed-seed regression checks the original ordinary pack sequence.
- Browser verification on an isolated preview origin revealed Dominik Kundel, Isa Fulford, Andrew Ambrosino, Peter Steinberger, then Tibo / Gold Rare. Inspected Tibo's rendered gold card, completed the haul, and started another pack. Checked special guide text and the root route's 99% holographic / 1% gold final-slot panel. No browser errors or warnings were reported.
- Left the sealed special pack ready at `http://localhost:5198/tibo-gold`. Test pulls used the separate origin; the temporary preview server was stopped afterward.

## Dimillian and Andrew in the special pack — 2026-09-08

- `/tibo-gold` now reserves Dimillian and Andrew Ambrosino for random positions among cards 1–4, along with two other random builders. Their finishes keep the usual odds. Tibo remains Gold Rare in slot 5, and all five people remain unique.
- Eleven tests and the production build pass. Across 10,000 special packs, both additional guarantees occur in all four opening positions and all four finishes; the other 27 builders remain available. The ordinary route's seeded sequence remains unchanged.
- Browser verification with seed 1 revealed Andrew Ambrosino / Standard, Johannes Heidecke / Holographic, Dimillian / Standard, Peter Steinberger / Reverse Holo, and Tibo / Gold Rare, then reached the haul. No browser warnings or errors. Test pulls used the separate preview origin; the temporary tab and server were closed afterward.

## More forgiving outside grabs and card-back footer — 2026-09-08

- Expanded the seal target to 64 CSS pixels on each side and 80 above for mouse input; touch gets 80 on each side and 96 above. The existing upper-wrapper target also gets 28 pixels below for mouse and 36 for touch.
- A temporary transparent hit area extends beyond the stage boundary while the wrapper is available, keeping outside grabs reachable without changing rendering dimensions. It is removed when the pack opens or a collection card is inspected, and restored when returning to a sealed wrapper.
- Browser checks opened packs with drags starting about 50 pixels outside the left and right edges. Dragging beside the lower wrapper did not open it, and clicking the first card still revealed it. At a 391×846 CSS viewport, a drag starting roughly 73 pixels above the wrapper and four pixels above the stage opened successfully. This was mouse-based responsive QA, not physical touch testing.
- Removed only `FAN EDITION` from the card-back footer. Inspected the resulting black-and-gold back with `OPENAI · SERIES 001` still present.
- Production build passes; browser reported no warnings or errors. Restored the viewport, closed the separate test tab, and stopped its temporary server. The main server remains on port 5198.

## Hide the panel until the first reveal — 2026-09-08

- Hide the rarity and card panels when tearing starts. The first face-down card keeps the card panel hidden; its details appear when its reveal finishes. Later cards keep their existing panel behavior.
- Returning from collection inspection respects the same visibility rule, including a partially torn pack or an unrevealed first card.
- Verified on `/tibo-gold?seed=1` using the separate preview origin: both panels were hidden during opening, stayed hidden beside the first card back, and stayed hidden after inspecting a saved card and returning. Revealing Andrew Ambrosino displayed his details. Production build passes and the browser reported no warnings or errors. Closed the temporary preview and stopped its server.

## Root page only — 2026-09-08

- Removed the special Tibo/Dimillian/Andrew pack mode, guaranteed-person generator options, special-mode tests, and its README instructions. Normal person selection and rarity odds remain, including 1% final-slot Gold Rare.
- The app normalizes old non-root preview URLs to `/`, retaining query parameters and the hash. No Sites configuration, source push, or deployment was performed.
- Nine tests and the production build pass, including the ordinary seeded-sequence regression. An isolated browser visit to `/tibo-gold?seed=1` normalized to `/?seed=1`, loaded the app, and displayed 99% holographic / 1% Gold Rare in the final-slot odds. No browser warnings or errors. Closed the test tab and stopped the temporary server.


## 2026-09-08 — Three starter packs and creator bonus

- Automated: `npm run check` passed all 15 tests and the production build after the final source changes; `git diff --check` passed. The existing Three.js chunk-size warning remains.
- Browser: played all three starter packs on the separate `http://127.0.0.1:5199/?seed=1` preview. Balance moved 3 → 2 → 1 → 0; all five cards in the third pack were revealed, and the summary inspection buttons remained available. Existing saved cards and lifetime pack counts were retained.
- At zero, the next-pack button was replaced by one **Follow me on X** action. Reloading retained zero credit and showed the reward panel instead of a tearable pack; Enter did not open a fourth pack.
- The follow action opened `https://x.com/itssotsot` in a new tab and immediately showed **Preparing your bonus… 5s** with a spinner. With no X sign-in or follow action, the app awarded 1,000 packs. Opening another pack reduced the balance to 999, which survived reload. No browser warnings or errors were captured.
- Responsive: checked the reward summary at a 391 × 846 CSS-pixel viewport. Fixed the initial overlap with the footer; the reward panel now ends before the footer and there is no horizontal overflow. Restored the viewport afterward. Physical touch was not tested.
- Unit coverage includes the five-second boundary, repeated clicks and callbacks, pending/claimed save restoration, old-save migration, exhausted credit, and malformed records. Pending reload timing is covered by tests; the browser reload check used the already-claimed reward.
- The bonus is a once-per-browser timed gift, not follow verification. Clearing browser storage resets the allowance. No API, account, server balance, or additional deployment was added.


## 2026-09-08 — Copy, card handoff, and inline bonus spinner

- Replaced all mystery wording in app JavaScript, including the summary CTA (**Open more booster packs**), bonus heading, and empty finish state. The counter uses **1 pack left** and plural wording for other counts.
- The next card interpolates from its stack position to z=0.85 during the outgoing-card animation (0.72 seconds normally, 0.18 with reduced motion). Browser screenshots captured an intermediate smaller back and the settled foreground back.
- Played a full pack and confirmed the right information panel is hidden for backs 1–5 and visible only after reveal. Checked collection inspection and return while card 2 was face-down; the panel remained hidden.
- Browser-confirmed **1 pack left** after opening the second starter pack and the renamed summary button.
- The follow link now remains in place while waiting, replacing its visible label with a centered spinner. Before and during loading its rectangle was identical (210 × 49 CSS pixels). There is no separate visible loading message; countdown status remains available to assistive technology. The bonus still completed with exactly 1,000 packs.
- `npm run check`: all 15 tests and production build passed. Browser console had no warnings/errors. No deployment or push performed.

## 2026-09-08 — Anonymous database saves

- Added an anonymous HttpOnly cookie session, a Sites D1 Worker API, and local SQLite persistence. No sign-in or recovery code. Existing browser collections and allowance import once; subsequent progress comes from the database.
- Final `npm run check` passed all 23 tests and both client and Worker builds. Coverage includes player isolation, invalid identities, one-time import, ordered/idempotent reveals, concurrent pack spending, server-timed five-second bonus, and unfinished-pack persistence after closing and reopening SQLite.
- HTTP smoke against the restarted local server at `http://localhost:5198` verified the root response, anonymous cookie creation, opening five cards, reveal persistence, advancement, and resumed state using a separate test player. Missing-cookie API requests return JSON 401 rather than the app HTML.
- Sites packaging succeeded with client assets, Worker entrypoint, DB metadata, and generated migration. Imported the built Worker to verify its fetch export and asset forwarding. `git diff --check` passed. Existing Three.js size and Node experimental SQLite warnings remain.
- No new browser interaction QA, source push, or hosted deployment was performed. The live site still needs a deployment to provision/apply the D1 migration. Clearing the player cookie loses access to that anonymous save; another browser creates a separate player.

## 2026-09-08 — Drag to explore room

- Background pointer drags move the independent room camera within bounded horizontal and vertical offsets. Release, cancellation, lost capture, window blur, and hidden-document events return the target to the original camera position. Reduced motion uses faster settling.
- Pack/card hit targets and UI controls are excluded from room gestures. Removed passive hover parallax so the room returns to its original composition.
- All 23 automated tests and the production build passed; diff whitespace validation passed. No browser interaction QA or deployment performed for this change.

## 2026-09-08 — Pack-level ownership and local reveals

- Replaced JSON player aggregates with `users`, individual owned `card` rows, and durable `pack_openings` request receipts. The new migration preserves identities, allowance, duplicate counts, and bonus state, and grants the unshown remainder of old unfinished packs without duplicating shown cards.
- The opening request starts when tearing begins. All five cards and the pack debit commit atomically; reveals and next-card animations run locally without network calls. Reload restores the collection rather than a reveal position. The first card still requires the server-generated pack response on a slow connection.
- All 28 tests pass, including concurrent same/different request IDs, retries after later openings, transaction rollback on insertion failure, duplicate expansion, migration of an old partly revealed pack, five-second bonus, and transport retry identity. Production build passed. Local HTTP smoke confirmed five owned cards immediately after opening and no resumed opening state on refresh.
- No browser interaction QA, push, or deployment performed for this revision.
