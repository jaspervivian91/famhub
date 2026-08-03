import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, "..", "public", "favicon.svg");
const outDir = join(__dirname, "..", "public", "icons");

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath, "utf-8");

// Ensure the SVG has explicit width/height for sharp to use
const sizedSvg = svg.replace(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">'
);

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(sizedSvg))
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
  console.log(`Generated ${size}x${size} icon`);
}

console.log("Done!");