/**
 * Generate the warm Family Core app icons (PWA + Apple touch) from the
 * canonical favicon mark.
 *
 * Source of truth: `public/favicon.svg` — the heart-roof house ("mushroom
 * heart house") in the warm palette (roof #3A6B4A, body outline #1A1A1A,
 * window #D4845A). The mark's GEOMETRY is never redrawn here; this script
 * only composites the existing mark onto warm cream (#F5F0EB) at the sizes
 * the web app manifest declares.
 *
 * Why a solid background: the manifest marks these icons as `maskable`, so
 * every pixel must be filled (a transparent maskable icon shows black bars
 * when Android crops it into a squircle/circle). The mark is scaled to 56%
 * of the canvas, which keeps the whole mark inside the maskable safe zone
 * (a centred circle of 80% diameter) with a little air around it.
 *
 * Usage:  bun run icons     (or: node scripts/generate-icons.mjs)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "favicon.svg");
const OUT_DIR = join(ROOT, "public", "icons");

const CREAM = "#F5F0EB"; // --color-fh-bg
/** Mark size as a fraction of the canvas — maskable-safe (0.56 < 0.80/√2 ≈ 0.57). */
const MARK_SCALE = 0.56;
/** The mark's visual centre sits slightly below the 100×100 box centre. */
const MARK_CENTER_Y = 53.5;

const TARGETS = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon-180.png", size: 180 },
];

function innerMarkup(svg) {
  const open = svg.indexOf(">", svg.indexOf("<svg"));
  const close = svg.lastIndexOf("</svg>");
  return svg.slice(open + 1, close).trim();
}

function composeCanvas(markup, size) {
  const mark = size * MARK_SCALE;
  const scale = mark / 100;
  const x = (size - mark) / 2;
  const y = (size - mark) / 2 - (MARK_CENTER_Y - 50) * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${CREAM}"/>
  <g transform="translate(${x.toFixed(3)}, ${y.toFixed(3)}) scale(${scale.toFixed(5)})">
${markup}
  </g>
</svg>
`;
}

const source = readFileSync(SRC, "utf8");
if (!source.includes('fill="#3A6B4A"') || !source.includes('fill="#D4845A"')) {
  throw new Error(
    "public/favicon.svg is not in the warm palette — refusing to render icons.",
  );
}
const markup = innerMarkup(source);

mkdirSync(OUT_DIR, { recursive: true });

for (const { file, size } of TARGETS) {
  const svg = Buffer.from(composeCanvas(markup, size));
  const out = join(OUT_DIR, file);
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()
    .then((buf) => writeFileSync(out, buf));
  console.log(`✓ public/icons/${file} (${size}×${size})`);
}
