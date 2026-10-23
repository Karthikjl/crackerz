/** Points sampled from rendered text, relative to the text block's center. */
export interface TextPoints {
  x: Float32Array;
  y: Float32Array;
  line: Uint8Array;
  count: number;
}

const FONT = '800 {size}px "Segoe UI", system-ui, sans-serif';

/**
 * Renders lines of text to an offscreen canvas and samples filled pixels on a grid.
 * maxPoints caps the result by widening the grid step. Browser only.
 */
export function textPoints(lines: readonly string[], maxWidth: number, maxHeight: number, maxPoints: number): TextPoints {
  const c = document.createElement("canvas");
  const g = c.getContext("2d", { willReadFrequently: true })!;

  const baseSize = Math.floor((maxHeight / lines.length) * 0.8);
  g.font = FONT.replace("{size}", String(baseSize));
  const widest = Math.max(1, ...lines.map((l) => g.measureText(l).width));
  const size = Math.max(12, widest > maxWidth ? Math.floor((baseSize * maxWidth) / widest) : baseSize);

  const lineH = size * 1.15;
  c.width = Math.ceil((widest * size) / baseSize + size);
  c.height = Math.ceil(lineH * lines.length + size * 0.3);
  g.font = FONT.replace("{size}", String(size));
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#fff";
  lines.forEach((l, i) => g.fillText(l, c.width / 2, lineH * (i + 0.5) + size * 0.15));

  const data = g.getImageData(0, 0, c.width, c.height).data;
  let filled = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 128) filled++;
  // filled counts every 4th pixel; pick a step so filled area / step² ≈ maxPoints.
  const step = Math.max(3, Math.ceil(Math.sqrt((filled * 4) / maxPoints)));

  const xs: number[] = [];
  const ys: number[] = [];
  const ls: number[] = [];
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      if (data[(y * c.width + x) * 4 + 3] > 128) {
        xs.push(x - c.width / 2);
        ys.push(y - c.height / 2);
        ls.push(Math.min(lines.length - 1, Math.floor(y / lineH)));
      }
    }
  }
  return { x: Float32Array.from(xs), y: Float32Array.from(ys), line: Uint8Array.from(ls), count: xs.length };
}
