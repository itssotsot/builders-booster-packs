# OpenAI logo assets

`openai-blossom.svg` is the unmodified white Blossom SVG from OpenAI's official logo archive, retrieved 2026-09-08.

- Source: https://cdn.openai.com/brand/OpenAI-Logos-2025.zip
- Archive member: `OpenAI-logos(new)/SVGs/OpenAI-white-monoblossom.svg`
- Brand reference and ownership: https://openai.com/brand/

OpenAI owns the logo. `CozyRoom.shelves()` uses its paths to create an extruded mesh with the original silhouette and cutouts, placed on the existing upper shelf stand. The neutral white material receives the room's lighting. The asset is bundled locally; the room does not request it from OpenAI at runtime.

`booster-pack-logo.svg` combines that same unaltered Blossom path with a custom jade pack outline, pink foil seams, and crimped edges. This native SVG replaces the former star in the header, loading view, empty collection, card backs, and favicon. Its explicit dimensions also keep its proportions correct when drawn onto the card-back canvas. No raster image generation was used for this mark.

Card backs use a black-and-gold recoloring of this same SVG, decoded before the canvas textures are created. The surrounding double border, orbital linework, and lettering share the gold palette against a near-black background.
