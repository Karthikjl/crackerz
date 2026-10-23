// Pixi particles store color as BGR, Graphics/Sprite tints take RGB.

export function hexToRgb(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

export function rgbToBgr(rgb: number): number {
  return ((rgb & 0xff) << 16) | (rgb & 0xff00) | ((rgb >> 16) & 0xff);
}

export function hexToBgr(hex: string): number {
  return rgbToBgr(hexToRgb(hex));
}

export const WHITE = 0xffffff;
export const GOLD_BGR = hexToBgr("#ffcf6b");
export const WARM_WHITE_BGR = hexToBgr("#fff1c9");
