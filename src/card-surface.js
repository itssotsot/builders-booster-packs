// One corner profile for the physical card, printed frame, and foil finish.
export const CARD_SURFACE = {
  width: 2.58,
  height: 3.61,
  radius: 0.12,
  textureWidth: 750,
  textureHeight: 1050,
  framePixels: 9,
};
export const CARD_RADIUS_PIXELS =
  (CARD_SURFACE.radius / CARD_SURFACE.width) * CARD_SURFACE.textureWidth;
