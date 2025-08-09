// ---- Color Helper ----
export function nearestColor(color, palette) {
  return palette.reduce((prev, curr) => {
    const dist = (r, g, b) =>
      (color[0] - r) ** 2 + (color[1] - g) ** 2 + (color[2] - b) ** 2;
    return dist(...curr) < dist(...prev) ? curr : prev;
  });
}

// ---- Error Diffusion Helpers ----
function distributeError(data, x, y, w, h, err, pattern) {
  for (const [dx, dy, factor] of pattern) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
      const idx = (ny * w + nx) * 4;
      data[idx] += err[0] * factor;
      data[idx + 1] += err[1] * factor;
      data[idx + 2] += err[2] * factor;
    }
  }
}

function applyErrorDiffusion(data, w, h, palette, pattern, errDivisor = 1) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const originalColor = [data[idx], data[idx + 1], data[idx + 2]];
      const quantizedColor = nearestColor(originalColor, palette);
      data[idx] = quantizedColor[0];
      data[idx + 1] = quantizedColor[1];
      data[idx + 2] = quantizedColor[2];
      const error = [
        (originalColor[0] - quantizedColor[0]) / errDivisor,
        (originalColor[1] - quantizedColor[1]) / errDivisor,
        (originalColor[2] - quantizedColor[2]) / errDivisor
      ];
      distributeError(data, x, y, w, h, error, pattern);
    }
  }
}

// ---- Floyd–Steinberg ----
export function floydSteinberg(data, w, h, palette) {
  applyErrorDiffusion(data, w, h, palette, [
    [1, 0, 7 / 16],
    [-1, 1, 3 / 16],
    [0, 1, 5 / 16],
    [1, 1, 1 / 16]
  ]);
}

// ---- Atkinson ----
export function atkinson(data, w, h, palette) {
  // Divide total error by 8, then distribute unit weights
  applyErrorDiffusion(data, w, h, palette, [
    [1, 0, 1],
    [2, 0, 1],
    [-1, 1, 1],
    [0, 1, 1],
    [1, 1, 1],
    [0, 2, 1]
  ], 8);
}

// ---- Jarvis–Judice–Ninke ----
export function jarvisJudiceNinke(data, w, h, palette) {
  applyErrorDiffusion(data, w, h, palette, [
    [1, 0, 7 / 48], [2, 0, 5 / 48],
    [-2, 1, 3 / 48], [-1, 1, 5 / 48], [0, 1, 7 / 48], [1, 1, 5 / 48], [2, 1, 3 / 48],
    [-2, 2, 1 / 48], [-1, 2, 3 / 48], [0, 2, 5 / 48], [1, 2, 3 / 48], [2, 2, 1 / 48]
  ]);
}

// ---- Stucki ----
export function stucki(data, w, h, palette) {
  applyErrorDiffusion(data, w, h, palette, [
    [1, 0, 8 / 42], [2, 0, 4 / 42],
    [-2, 1, 2 / 42], [-1, 1, 4 / 42], [0, 1, 8 / 42], [1, 1, 4 / 42], [2, 1, 2 / 42],
    [-2, 2, 1 / 42], [-1, 2, 2 / 42], [0, 2, 4 / 42], [1, 2, 2 / 42], [2, 2, 1 / 42]
  ]);
}

// ---- Burkes ----
export function burkes(data, w, h, palette) {
  applyErrorDiffusion(data, w, h, palette, [
    [1, 0, 8 / 32], [2, 0, 4 / 32],
    [-2, 1, 2 / 32], [-1, 1, 4 / 32], [0, 1, 8 / 32], [1, 1, 4 / 32], [2, 1, 2 / 32]
  ]);
}

// ---- Sierra (original 3-row) ----
export function sierra(data, w, h, palette) {
  applyErrorDiffusion(data, w, h, palette, [
    [1, 0, 5 / 32], [2, 0, 3 / 32],
    [-2, 1, 2 / 32], [-1, 1, 4 / 32], [0, 1, 5 / 32], [1, 1, 4 / 32], [2, 1, 2 / 32],
    [-1, 2, 2 / 32], [0, 2, 3 / 32], [1, 2, 2 / 32]
  ]);
}

// ---- Sierra Lite ----
export function sierraLite(data, w, h, palette) {
  applyErrorDiffusion(data, w, h, palette, [
    [1, 0, 2 / 4],
    [-1, 1, 1 / 4], [0, 1, 1 / 4]
  ]);
}

// ---- Ordered Dither ----
export function orderedDither(data, w, h, palette, size) {
  const n = Math.max(2, Math.min(8, size));
  const matrix = generateBayerMatrix(n);
  const denom = n * n;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const old = [data[idx], data[idx + 1], data[idx + 2]];
      const gray = (old[0] + old[1] + old[2]) / 3;
      const threshold = ((matrix[y % n][x % n] + 0.5) / denom) * 255;
      const newVal = gray < threshold ? palette[0] : palette[palette.length - 1];
      data[idx] = newVal[0];
      data[idx + 1] = newVal[1];
      data[idx + 2] = newVal[2];
    }
  }
}

// ---- Nearest (no dithering) ----
export function nearest(data, w, h, palette) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const old = [data[idx], data[idx + 1], data[idx + 2]];
      const newCol = nearestColor(old, palette);
      data[idx] = newCol[0];
      data[idx + 1] = newCol[1];
      data[idx + 2] = newCol[2];
    }
  }
}

// ---- Helpers ----
function generateBayerMatrix(n) {
  // Only supports power-of-two sizes up to 8; fallback to nearest supported
  let size = 2;
  let m = [
    [0, 2],
    [3, 1]
  ];
  while (size < n) {
    const next = size * 2;
    const res = Array.from({ length: next }, () => Array(next).fill(0));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = m[y][x] * 4;
        res[y][x] = v + 0; // top-left
        res[y][x + size] = v + 2; // top-right
        res[y + size][x] = v + 3; // bottom-left
        res[y + size][x + size] = v + 1; // bottom-right
      }
    }
    m = res;
    size = next;
  }
  // If n is not a power of two, trim to n
  if (m.length !== n) {
    m = m.slice(0, n).map(row => row.slice(0, n));
  }
  return m;
}