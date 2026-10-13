// Prepare compatibility PNGs from the dedicated email image cutouts.
// These inputs are intentionally independent of website SVGs and fonts.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'cms/public/brand');
await fs.mkdir(output, { recursive: true });
const sourceLogo = await fs.readFile(path.join(output, 'sc-logo-cutout.png'));
const sourceWordmark = await fs.readFile(path.join(output, 's4meer-logo-cutout.png'));
for (const colors of [
  { suffix: '' },
  { suffix: '-dark' },
]) {
  await sharp(sourceLogo).resize({ width: 264 }).png().toFile(path.join(output, `sc-email${colors.suffix}.png`));
  await sharp(sourceWordmark).resize({ width: 1200 }).png().toFile(path.join(output, `s4meer-email${colors.suffix}.png`));
}
console.log('Prepared email PNGs from the dedicated logo image cutouts.');
