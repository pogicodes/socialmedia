// Generates favicon / app / PWA icons from public/logo.png (1024×1024, transparent).
// Run: node scripts/build-icons.mjs
import { mkdir, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = "public/logo.png";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/** Logo scaled to `size`, optionally padded (fraction of size) onto a solid background. */
function icon(size, { pad = 0, bg } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const img = sharp(SRC).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const margin = Math.floor((size - inner) / 2);
  const extended = img.extend({
    top: margin,
    left: margin,
    bottom: size - inner - margin,
    right: size - inner - margin,
    background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });
  return (bg ? extended.flatten({ background: bg }) : extended).png({ compressionLevel: 9 }).toBuffer();
}

/** Multi-resolution .ico with embedded PNG frames (supported by all modern browsers). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, buf }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

const out = {
  // Next.js metadata file conventions (auto <link> tags)
  "src/app/favicon.ico": ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await icon(size) })))),
  "src/app/icon1.png": await icon(32),
  "src/app/icon2.png": await icon(192), // Google Search favicon: multiple of 48px
  "src/app/apple-icon.png": await icon(180, { pad: 0.08, bg: WHITE }), // iOS ignores transparency
  // Web app manifest
  "public/icons/icon-192.png": await icon(192),
  "public/icons/icon-512.png": await icon(512),
  "public/icons/maskable-512.png": await icon(512, { pad: 0.15, bg: WHITE }), // keep logo inside the safe zone
};

await rm("src/app/icon.png", { force: true }); // replaced by icon1/icon2 (the 1024px one was ~270KB)
await mkdir("public/icons", { recursive: true });
for (const [path, buf] of Object.entries(out)) {
  await writeFile(path, buf);
  console.log(`${path}  ${buf.length}B`);
}
