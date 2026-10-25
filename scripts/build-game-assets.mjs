#!/usr/bin/env node
/**
 * Builds public/game/* from the "Ninja Adventure" asset pack (CC0, Pixel-boy & AAA)
 * plus a few custom sprites (jeepney, coconut tree, lamok, ipis, platform signs),
 * and generates the island map as a Tiled-compatible JSON (open it in Tiled to edit).
 *
 * Usage: PACK_DIR="/path/to/Ninja Adventure - Asset Pack" node scripts/build-game-assets.mjs
 * Requires: sharp (via next), ffmpeg on PATH for audio.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import * as icons from "simple-icons";

const PACK = process.env.PACK_DIR;
if (!PACK || !fs.existsSync(PACK)) {
  console.error("Set PACK_DIR to the extracted 'Ninja Adventure - Asset Pack' folder.");
  process.exit(1);
}
const OUT = path.resolve("public/game");
const T = 16;
const p = (...a) => path.join(PACK, ...a);
const out = (...a) => {
  const f = path.join(OUT, ...a);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  return f;
};

// ---------------------------------------------------------------- copies
const copies = {
  "tiles/field.png": p("Backgrounds/Tilesets/TilesetField.png"),
  "tiles/water.png": p("Backgrounds/Tilesets/TilesetWater.png"),
  "tiles/floor.png": p("Backgrounds/Tilesets/TilesetFloor.png"),
  "tiles/nature.png": p("Backgrounds/Tilesets/TilesetNature.png"),
  "sprites/coin.png": p("Items/Treasure/Coin2.png"),
  "sprites/heart.png": p("Ui/Receptacle/Heart.png"),
  "sprites/smoke.png": p("FX/Smoke/Smoke/SpriteSheet.png"),
  "sprites/ripple.png": p("Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png"),
  "sprites/chest.png": p("Items/Treasure/LittleTreasureChest.png"),
};
for (const [dst, src] of Object.entries(copies)) fs.copyFileSync(src, out(dst));

// ---------------------------------------------------------------- crops (tile units)
const crop = (src, dst, c, r, w, h) =>
  sharp(src).extract({ left: c * T, top: r * T, width: w * T, height: h * T }).png().toFile(out(dst));

const HOUSE = p("Backgrounds/Tilesets/TilesetHouse.png");
const NATURE = p("Backgrounds/Tilesets/TilesetNature.png");
/** Buildings: [file, col, row, w, h] in TilesetHouse */
const BUILDINGS = {
  facebook: [0, 0, 4, 3], // orange-roof house → Barangay Hall
  youtube: [16, 0, 3, 3], // shop with signboard → Sinehan
  tiktok: [19, 0, 4, 3], // lantern bar → Videoke Stage
  instagram: [23, 0, 3, 3], // round adobe → Photo Booth
  x: [3, 7, 3, 3], // thatched nipa hut → Chismis Corner
  github: [12, 0, 4, 3], // red-roof temple → Code Dojo
  website: [29, 0, 4, 3], // wooden house with signboard → Aklatan (blog)
  threads: [4, 0, 4, 3], // sand-plaster house → Tambayan (Threads)
  about: [26, 0, 3, 3], // orange corner house → Bahay ni Pogi (about me, no quest)
};
await Promise.all([
  ...Object.entries(BUILDINGS).map(([id, [c, r, w, h]]) => crop(HOUSE, `buildings/${id}.png`, c, r, w, h)),
  crop(HOUSE, "sprites/dojo-sign.png", 4, 4, 2, 1),
  crop(HOUSE, "sprites/banner-red.png", 22, 20, 1, 2),
  crop(HOUSE, "sprites/banner-green.png", 24, 20, 1, 2),
  crop(NATURE, "sprites/tree.png", 6, 8, 2, 2),
  crop(NATURE, "sprites/bush-tree.png", 0, 0, 2, 2),
  crop(NATURE, "sprites/bamboo.png", 11, 8, 1, 3),
  crop(NATURE, "sprites/rock.png", 15, 9, 1, 1),
  crop(NATURE, "sprites/boulder.png", 13, 8, 2, 2),
]);

// ---------------------------------------------------------------- custom pixel sprites
/** ASCII pixel art → PNG. Rows are padded/trimmed to width. */
async function ascii(dst, frames, palette, w, h) {
  const buf = Buffer.alloc(w * frames.length * h * 4);
  frames.forEach((rows, f) => {
    for (let y = 0; y < h; y++) {
      const row = (rows[y] ?? "").padEnd(w, ".").slice(0, w);
      for (let x = 0; x < w; x++) {
        const c = palette[row[x]];
        if (!c) continue;
        const i = (y * w * frames.length + f * w + x) * 4;
        buf[i] = c[0];
        buf[i + 1] = c[1];
        buf[i + 2] = c[2];
        buf[i + 3] = c[3] ?? 255;
      }
    }
  });
  await sharp(buf, { raw: { width: w * frames.length, height: h, channels: 4 } }).png().toFile(out(dst));
}

const K = [20, 18, 24];
// Lamok (mosquito) — 2 frames, wings flap
await ascii(
  "sprites/lamok.png",
  [
    [
      "................",
      "..ww........ww..",
      ".wwww......wwww.",
      ".wwwww....wwwww.",
      "..wwwwkkkkwwww..",
      "....wwkddkww....",
      ".....kddddk.....",
      "..l..kddddk..l..",
      "...l.kdrrdk.l...",
      "....lkdrrdkl....",
      "...l.kdrrdk.l...",
      "..l...kddk...l..",
      ".......kk.......",
      ".......kk.......",
      "................",
      "................",
    ],
    [
      "................",
      "................",
      "................",
      "................",
      "......kkkk......",
      "..wwwwkddkwwww..",
      ".wwwwkddddkwwww.",
      ".wwwwkddddkwwww.",
      "..ww.kdrrdk.ww..",
      "....lkdrrdkl....",
      "...l.kdrrdk.l...",
      "..l...kddk...l..",
      ".l.....kk.....l.",
      ".......kk.......",
      "................",
      "................",
    ],
  ],
  { k: K, d: [70, 70, 84], r: [214, 48, 49], w: [210, 236, 255, 190], l: [60, 60, 70] },
  16,
  16,
);

// Ipis (cockroach) — 2 frames, legs scuttle
await ascii(
  "sprites/ipis.png",
  [
    [
      "......k..k......",
      ".....k....k.....",
      "......kkkk......",
      ".....kBBBBk.....",
      ".k..kbbhbbbk..k.",
      "..kkbbhbbbbbkk..",
      "....kbhbbbbbk...",
      ".kkkbbbbbbbbkkk.",
      "....kbbbbbbbk...",
      "..kkbBbbbbBbkk..",
      ".k..kbBbbBbbk..k",
      "....kbbBBbbk....",
      ".....kbbbbk.....",
      "......kkkk......",
      "................",
      "................",
    ],
    [
      ".....k....k.....",
      "......k..k......",
      "......kkkk......",
      ".....kBBBBk.....",
      "..k.kbbhbbbk.k..",
      ".k.kbbhbbbbbk.k.",
      "....kbhbbbbbk...",
      "..kkbbbbbbbbkk..",
      ".k..kbbbbbbbk..k",
      "...kbBbbbbBbk...",
      "..k.kbBbbBbbk.k.",
      ".k..kbbBBbbk..k.",
      ".....kbbbbk.....",
      "......kkkk......",
      "................",
      "................",
    ],
  ],
  { k: K, b: [140, 74, 38], B: [96, 48, 24], h: [196, 120, 70] },
  16,
  16,
);

/** SVG (crispEdges) → PNG at exact pixel size. */
const svg = (dst, w, h, body) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" shape-rendering="crispEdges">${body}</svg>`,
    ),
  )
    .png()
    .toFile(out(dst));

// Jeepney — 48x32, side view facing right
await svg(
  "sprites/jeepney.png",
  48,
  32,
  `
  <rect x="3" y="7" width="40" height="3" fill="#b3261e" stroke="#141218"/>
  <rect x="14" y="3" width="18" height="4" fill="#ffd23f" stroke="#141218"/>
  <rect x="17" y="4" width="12" height="2" fill="#141218"/>
  <rect x="2" y="10" width="40" height="13" fill="#d7dde4" stroke="#141218"/>
  <rect x="41" y="14" width="6" height="9" fill="#c4ccd6" stroke="#141218"/>
  <rect x="43" y="11" width="2" height="3" fill="#e8edf2" stroke="#141218"/>
  <rect x="5" y="12" width="6" height="5" fill="#2b2d42"/>
  <rect x="13" y="12" width="6" height="5" fill="#2b2d42"/>
  <rect x="21" y="12" width="6" height="5" fill="#2b2d42"/>
  <rect x="29" y="12" width="6" height="5" fill="#2b2d42"/>
  <rect x="37" y="12" width="4" height="5" fill="#8ecae6"/>
  <rect x="3" y="18" width="39" height="1" fill="#e63946"/>
  <rect x="3" y="19" width="39" height="1" fill="#ffd23f"/>
  <rect x="3" y="20" width="39" height="1" fill="#1d4ed8"/>
  <rect x="45" y="16" width="2" height="2" fill="#ffe066"/>
  <rect x="1" y="21" width="47" height="2" fill="#9aa5b1" stroke="#141218"/>
  <circle cx="11" cy="24" r="4" fill="#141218"/>
  <circle cx="37" cy="24" r="4" fill="#141218"/>
  <rect x="10" y="23" width="2" height="2" fill="#9aa5b1"/>
  <rect x="36" y="23" width="2" height="2" fill="#9aa5b1"/>
  <rect x="6" y="28" width="38" height="2" fill="#000" fill-opacity=".25"/>
`,
);

// Coconut tree — 32x48
await svg(
  "sprites/coconut.png",
  32,
  48,
  `
  <ellipse cx="17" cy="45" rx="8" ry="2" fill="#000" fill-opacity=".2"/>
  <path d="M15 45 L19 45 L19 30 L18 20 L17 14 L15 14 L16 20 L16 30 Z" fill="#a0673a" stroke="#3b2414"/>
  <rect x="16" y="22" width="3" height="1" fill="#6b4226"/>
  <rect x="16" y="27" width="3" height="1" fill="#6b4226"/>
  <rect x="16" y="32" width="3" height="1" fill="#6b4226"/>
  <rect x="16" y="37" width="3" height="1" fill="#6b4226"/>
  <rect x="16" y="41" width="3" height="1" fill="#6b4226"/>
  <path d="M16 12 L4 9 L1 13 L6 12 L10 13 Z" fill="#3f8f3a" stroke="#1f3d1c"/>
  <path d="M16 12 L28 9 L31 13 L26 12 L22 13 Z" fill="#3f8f3a" stroke="#1f3d1c"/>
  <path d="M16 11 L8 3 L3 4 L9 6 L12 10 Z" fill="#58b04f" stroke="#1f3d1c"/>
  <path d="M16 11 L24 3 L29 4 L23 6 L20 10 Z" fill="#58b04f" stroke="#1f3d1c"/>
  <path d="M16 11 L15 1 L18 1 L18 10 Z" fill="#6cc260" stroke="#1f3d1c"/>
  <path d="M16 13 L7 19 L5 22 L10 18 Z" fill="#3f8f3a" stroke="#1f3d1c"/>
  <path d="M17 13 L26 19 L28 22 L23 18 Z" fill="#3f8f3a" stroke="#1f3d1c"/>
  <circle cx="15" cy="14" r="2" fill="#7a4a24" stroke="#3b2414"/>
  <circle cx="19" cy="14" r="2" fill="#7a4a24" stroke="#3b2414"/>
  <circle cx="17" cy="16" r="2" fill="#8d5a2e" stroke="#3b2414"/>
`,
);

// Platform signboards — 20x24 (board with icon on a post)
const SIGNS = {
  facebook: [icons.siFacebook, "#1877F2"],
  youtube: [icons.siYoutube, "#FF0033"],
  tiktok: [icons.siTiktok, "#111111"],
  instagram: [icons.siInstagram, "#E1306C"],
  x: [icons.siX, "#111111"],
  github: [icons.siGithub, "#8B5CF6"],
  website: [{ path: "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" }, "#16A34A"],
  threads: [icons.siThreads, "#101010"],
  // person (Material Design, Apache-2.0)
  about: [{ path: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" }, "#EA580C"],
};
await Promise.all(
  Object.entries(SIGNS).map(([id, [icon, color]]) =>
    sharp(
      Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="96">
        <rect x="36" y="56" width="8" height="40" fill="#8b5a2b" stroke="#2a1a0c" stroke-width="4"/>
        <rect x="4" y="4" width="72" height="60" rx="8" fill="${color}" stroke="#141218" stroke-width="6"/>
        <g transform="translate(22 16) scale(1.5)"><path d="${icon.path}" fill="#fff"/></g>
      </svg>`),
    )
      .resize(20, 24)
      .png()
      .toFile(out(`sprites/sign-${id}.png`)),
  ),
);

// ---------------------------------------------------------------- audio (wav/ogg → mp3)
const AUDIO = {
  "music.mp3": "Audio/Musics/31 - Sunny.ogg",
  "coin.mp3": "Audio/Sounds/Bonus/Coin.wav",
  "hit.mp3": "Audio/Sounds/Hit & Impact/Hit1.wav",
  "heal.mp3": "Audio/Sounds/Bonus/PowerUp1.wav",
  "open.mp3": "Audio/Sounds/Menu/Accept.wav",
  "close.mp3": "Audio/Sounds/Menu/Cancel.wav",
  "step.mp3": "Audio/Sounds/Menu/Move1.wav",
  "clear.mp3": "Audio/Jingles/Success1.wav",
  "gameover.mp3": "Audio/Jingles/GameOver.wav",
  "complete.mp3": "Audio/Jingles/LevelUp1.wav",
};
for (const [dst, src] of Object.entries(AUDIO)) {
  const isMusic = dst === "music.mp3";
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", p(src),
    "-ac", "1", "-b:a", isMusic ? "64k" : "48k",
    out("audio", dst),
  ]);
}

// ---------------------------------------------------------------- Pogi (custom, 16x24, 4 dirs × 4 walk frames)
/** grid[row][col] = ascii rows; writes a (cols*w)×(rows*h) sheet */
async function asciiGrid(dst, grid, palette, w, h) {
  const R = grid.length;
  const C = grid[0].length;
  const W = C * w;
  const buf = Buffer.alloc(W * R * h * 4);
  grid.forEach((row, r) =>
    row.forEach((rows, c) => {
      for (let y = 0; y < h; y++) {
        const line = (rows[y] ?? "").padEnd(w, ".").slice(0, w);
        for (let x = 0; x < w; x++) {
          const col = palette[line[x]];
          if (!col) continue;
          const i = ((r * h + y) * W + c * w + x) * 4;
          buf[i] = col[0];
          buf[i + 1] = col[1];
          buf[i + 2] = col[2];
          buf[i + 3] = col[3] ?? 255;
        }
      }
    }),
  );
  await sharp(buf, { raw: { width: W, height: R * h, channels: 4 } }).png().toFile(out(dst));
}

const DOWN_TOP = [
  "................",
  "......kkkk......",
  "....kkhhhhkk....",
  "...khhhhHhhhk...",
  "...khhhhhHhhk...",
  "...khhhhhhhhk...",
  "...khsshhsssk...",
  "...kssssssssk...",
  "...kgggkkgggk...",
  "...kgGgkkgGgk...",
  "...kssssssssk...",
  "....kssmmssk....",
  ".....kksskk.....",
  "...kkjjjjjjkk...",
  "..ksjjjnnjjjsk..",
  "..ksjjjnnjjjsk..",
  "..ksjjjjjjjjsk..",
  "..kskJJJJJJksk..",
  "...kkppppppkk...",
  "....kppppppk....",
];
const UP_TOP = [
  "................",
  "......kkkk......",
  "....kkhhhhkk....",
  "...khhhhhhhhk...",
  "...khhHhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...kshhhhhhsk...",
  "...kkhhhhhhkk...",
  "....kksssskk....",
  ".....kksskk.....",
  "...kkjjjjjjkk...",
  "..ksjjnnnnjjsk..",
  "..ksjjnjjnjjsk..",
  "..ksjjnnnnjjsk..",
  "..kskJJJJJJksk..",
  "...kkppppppkk...",
  "....kppppppk....",
];
const FRONT_LEGS = [
  ["....kppkkppk....", "....ksskkssk....", "....kffkkffk....", "....kkkkkkkk...."],
  ["....kppkkppk....", "....ksskkssk....", "....kffkkssk....", "....kkkkkffk...."],
  ["....kppkkppk....", "....ksskkssk....", "....kffkkffk....", "....kkkkkkkk...."],
  ["....kppkkppk....", "....ksskkssk....", "....ksskkffk....", "....kffkkkkk...."],
];
const SIDE_TOP = [
  "................",
  ".....kkkkk......",
  "....khhhhhkk....",
  "...khhhhhHhhk...",
  "...khhhhhhHhk...",
  "...khhhhhhhhhk..",
  "...khhhhsssssk..",
  "...khhhssssssk..",
  "...khhsggggggk..",
  "...khhssgGgggk..",
  "...kkhsssssssk..",
  "....kkssssmsk...",
  ".....kksskkk....",
  "....kkjjjjjkk...",
  "....kjjjjjjjk...",
  "....kjjjsjjjk...",
  "....kjjjsjjjk...",
  "....kJJJsJJJk...",
  "....kkppppppk...",
  ".....kpppppk....",
];
const SIDE_LEGS = [
  [".....kppppk.....", ".....kssssk.....", ".....kffffk.....", ".....kkkkkk....."],
  [".....kppppk.....", "....ksk..ksk....", "....kfk..kfk....", "....kkk..kkk...."],
  [".....kppppk.....", ".....kssssk.....", ".....kffffk.....", ".....kkkkkk....."],
  [".....kpkkpk.....", "....kskkssk.....", "....kffkkffk....", "....kkkkkkkk...."],
];
const mirror = (rows) => rows.map((r) => r.padEnd(16, ".").slice(0, 16).split("").reverse().join(""));
const POGI_PAL = {
  k: [20, 18, 24], h: [28, 26, 36], H: [78, 74, 104], s: [201, 138, 90], S: [168, 108, 68],
  g: [12, 12, 18], G: [110, 180, 240], m: [122, 59, 43], j: [24, 119, 242], J: [15, 79, 168],
  n: [255, 255, 255], p: [45, 45, 58], f: [230, 57, 70],
};
// columns: down, up, left, right — rows: walk frames 0..3
await asciiGrid(
  "sprites/pogi.png",
  [0, 1, 2, 3].map((f) => [
    [...DOWN_TOP, ...FRONT_LEGS[f]],
    [...UP_TOP, ...FRONT_LEGS[f]],
    mirror([...SIDE_TOP, ...SIDE_LEGS[f]]),
    [...SIDE_TOP, ...SIDE_LEGS[f]],
  ]),
  POGI_PAL,
  16,
  24,
);

// ---------------------------------------------------------------- custom tileset: road autotile (16 masks) + bridges
// mask bits: N=1, E=2, S=4, W=8
{
  const W = 16 * 16;
  const H = 80;
  const buf = Buffer.alloc(W * H * 4);
  const put = (x, y, c) => {
    const i = (y * W + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = 255;
  };
  const D = [214, 168, 112];
  const E = [150, 104, 64];
  const SP = [190, 146, 96];
  for (let mask = 0; mask < 16; mask++) {
    const inPath = (x, y) => {
      if (x < 0 || y < 0 || x > 15 || y > 15) {
        if (y < 0) return !!(mask & 1);
        if (x > 15) return !!(mask & 2);
        if (y > 15) return !!(mask & 4);
        return !!(mask & 8);
      }
      if (x >= 3 && x <= 12 && y >= 3 && y <= 12) return true;
      if (mask & 1 && x >= 3 && x <= 12 && y < 3) return true;
      if (mask & 2 && y >= 3 && y <= 12 && x > 12) return true;
      if (mask & 4 && x >= 3 && x <= 12 && y > 12) return true;
      if (mask & 8 && y >= 3 && y <= 12 && x < 3) return true;
      return false;
    };
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!inPath(x, y)) continue;
        const edge = !inPath(x - 1, y) || !inPath(x + 1, y) || !inPath(x, y - 1) || !inPath(x, y + 1);
        const speck = ((x * 7 + y * 13 + mask * 3) % 11 === 0);
        put(mask * 16 + x, y, edge ? E : speck ? SP : D);
      }
  }
  // bridges (row 1): cols 0-2 vertical (walk N–S) left/mid/right, cols 3-5 horizontal (walk E–W) top/mid/bottom
  const WOOD = [176, 120, 70];
  const SEAM = [120, 78, 44];
  const RAIL = [86, 54, 30];
  const POST = [60, 36, 20];
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const plankV = y % 4 === 3 ? SEAM : WOOD;
      const plankH = x % 4 === 3 ? SEAM : WOOD;
      put(0 * 16 + x, 16 + y, x <= 2 ? (y % 8 < 2 ? POST : RAIL) : plankV);
      put(1 * 16 + x, 16 + y, plankV);
      put(2 * 16 + x, 16 + y, x >= 13 ? (y % 8 < 2 ? POST : RAIL) : plankV);
      put(3 * 16 + x, 16 + y, y <= 2 ? (x % 8 < 2 ? POST : RAIL) : plankH);
      put(4 * 16 + x, 16 + y, plankH);
      put(5 * 16 + x, 16 + y, y >= 13 ? (x % 8 < 2 ? POST : RAIL) : plankH);
    }
  // grass-on-sand 3x3 (rows 2-4, cols 0-2): jagged grass fringe fading onto beach sand — no outline/water-like rim
  const field = await sharp(p("Backgrounds/Tilesets/TilesetField.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const fpx = (tc, tr, x, y) => {
    const i = ((tr * 16 + y) * field.info.width + tc * 16 + x) * 4;
    return [field.data[i], field.data[i + 1], field.data[i + 2]];
  };
  const J = [0, 1, 1, 0, -1, 0, 1, 2, 1, 0, 0, -1, 0, 1, 0, 0];
  for (let cy = 0; cy < 3; cy++)
    for (let cx = 0; cx < 3; cx++) {
      const L = cx === 0, R = cx === 2, Tp = cy === 0, B = cy === 2;
      const inside = (x, y) =>
        (!L || x >= 6 + J[y & 15]) && (!R || x < 10 + J[(y + 5) & 15]) && (!Tp || y >= 6 + J[(x + 3) & 15]) && (!B || y < 10 + J[(x + 9) & 15]);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          let c;
          if (inside(x, y)) {
            c = fpx(1, 4, x, y); // grass centre
            const rim = (xx, yy) => xx >= 0 && yy >= 0 && xx < 16 && yy < 16 && !inside(xx, yy);
            if (rim(x - 1, y) || rim(x + 1, y) || rim(x, y - 1) || rim(x, y + 1)) c = c.map((v) => Math.round(v * 0.78));
          } else c = fpx(1, 1, x, y); // sand centre
          put(cx * 16 + x, (2 + cy) * 16 + y, c);
        }
    }
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out("tiles/custom.png"));
}

// ---------------------------------------------------------------- map (Tiled JSON)
const W = 79;
const H = 42; // main beach sits near the bottom edge: the camera clamps there, so the start screen shows the halls
const TILESETS = [
  { name: "water", image: "../tiles/water.png", w: 448, h: 272 },
  { name: "field", image: "../tiles/field.png", w: 80, h: 240 },
  { name: "floor", image: "../tiles/floor.png", w: 352, h: 416 },
  { name: "nature", image: "../tiles/nature.png", w: 384, h: 336 },
  { name: "custom", image: "../tiles/custom.png", w: 256, h: 80 },
];
let first = 1;
for (const ts of TILESETS) {
  ts.cols = ts.w / T;
  ts.count = ts.cols * Math.floor(ts.h / T);
  ts.firstgid = first;
  first += ts.count;
}
const gid = (name, col, row) => {
  const ts = TILESETS.find((t) => t.name === name);
  return ts.firstgid + row * ts.cols + col;
};
const layer = () => new Array(W * H).fill(0);
const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const idx = (x, y) => y * W + x;
const set = (l, x, y, v) => inMap(x, y) && (l[idx(x, y)] = v);
const rect9 = (l, x0, y0, x1, y1, ts, c0, r0) => {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const cx = x === x0 ? 0 : x === x1 ? 2 : 1;
      const cy = y === y0 ? 0 : y === y1 ? 2 : 1;
      set(l, x, y, gid(ts, c0 + cx, r0 + cy));
    }
};

const water = layer().fill(gid("water", 1, 1));
const ground = layer();
const detail = layer();
const roadsL = layer();
const secretL = layer();
const blocked = new Uint8Array(W * H).fill(1);
const walk = (x0, y0, x1, y1, v = 0) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y)) blocked[idx(x, y)] = v;
};

// ---- islands: [sand rect, grass rect]
const ISLANDS = {
  main: [[19, 21, 47, 39], [20, 22, 46, 36]], // YouTube · Facebook · TikTok face the spawn beach
  instagram: [[4, 28, 15, 39], [5, 29, 14, 38]],
  x: [[51, 28, 62, 39], [52, 29, 61, 38]],
  github: [[29, 5, 43, 17], [30, 6, 42, 16]],
  website: [[4, 13, 15, 24], [5, 14, 14, 23]],
  threads: [[51, 13, 62, 24], [52, 14, 61, 23]],
  hidden: [[66, 31, 75, 39], null],
};
for (const [sand, grass] of Object.values(ISLANDS)) {
  rect9(ground, ...sand, "field", 0, 0);
  if (grass) rect9(ground, ...grass, "custom", 0, 2);
  walk(...sand);
}
walk(...ISLANDS.hidden[0], 1); // reachable only after unlock (bridge) — set walkable below
walk(67, 32, 74, 38); // inner hidden beach

// Pond (main island)
const pond = [40, 27, 41, 29];
rect9(ground, ...pond, "water", 0, 6);
walk(...pond, 1);

// ---- bridges (3 wide). vertical: x0..x0+2, y0..y1 · horizontal: x0..x1, y0..y0+2 (water span)
// Each bridge also lands one tile onto both shores: the sand edge tiles have a transparent
// rim, so a bridge stopping at the waterline leaves a sliver of (walkable) water showing.
const bridges = [];
const vBridge = (x0, y0, y1, secret = false) => {
  for (let y = y0 - 1; y <= y1 + 1; y++) for (let i = 0; i < 3; i++) bridges.push({ x: x0 + i, y, tile: [i, 1], secret });
};
const hBridge = (x0, x1, y0, secret = false) => {
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let i = 0; i < 3; i++) bridges.push({ x, y: y0 + i, tile: [3 + i, 1], secret });
};
vBridge(35, 18, 20); // main ↔ GitHub islet (north)
hBridge(16, 18, 35); // main ↔ Instagram islet (west)
hBridge(48, 50, 35); // main ↔ X islet (east)
vBridge(11, 25, 27); // Instagram ↔ blog islet (north-west)
vBridge(53, 25, 27); // X ↔ Threads islet (north-east)
hBridge(63, 65, 35, true); // X ↔ hidden beach (locked)

// ---- roads (1 wide, orthogonal segments)
const road = new Uint8Array(W * H);
const seg = (x0, y0, x1, y1) => {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) road[idx(x, y)] = 1;
};
// main island
seg(20, 36, 46, 36); // main street: west bridge ↔ east bridge, right past all three doors
seg(32, 37, 32, 38); // spawn → Barangay Hall, straight ahead
seg(36, 22, 36, 35); // north to GitHub bridge (between the hall and the stage)
seg(22, 26, 44, 26); // backyard lane
seg(22, 27, 22, 35); // loop west
seg(44, 27, 44, 35); // loop east
// GitHub islet
seg(36, 13, 36, 16);
// Instagram islet
seg(9, 36, 14, 36);
seg(12, 29, 12, 35); // → blog bridge
// blog islet
seg(7, 21, 12, 21);
seg(12, 22, 12, 23);
// X islet
seg(52, 36, 62, 36); // (+ to hidden beach)
seg(54, 29, 54, 35); // → Threads bridge
// Threads islet
seg(54, 21, 54, 23);
seg(55, 21, 57, 21);
// hidden beach
seg(66, 36, 68, 36);

for (const b of bridges) if (!b.secret) road[idx(b.x, b.y)] = 2;
for (let i = 0; i < W * H; i++) if (road[i]) blocked[i] = 0;

const isBridge = (x, y) => bridges.some((b) => b.x === x && b.y === y);
// roads join public bridges only; the hidden-beach road dead-ends at the shore until its bridge appears
const isPublicBridge = (x, y) => bridges.some((b) => b.x === x && b.y === y && !b.secret);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    if (road[idx(x, y)] !== 1) continue;
    const r = (xx, yy) => inMap(xx, yy) && (road[idx(xx, yy)] > 0 || isPublicBridge(xx, yy));
    const mask = (r(x, y - 1) ? 1 : 0) | (r(x + 1, y) ? 2 : 0) | (r(x, y + 1) ? 4 : 0) | (r(x - 1, y) ? 8 : 0);
    set(roadsL, x, y, gid("custom", mask, 0));
  }
for (const b of bridges) set(b.secret ? secretL : roadsL, b.x, b.y, gid("custom", ...b.tile));

// ---- objects
const objects = [];
let oid = 1;
const obj = (o) =>
  objects.push({
    id: oid++, rotation: 0, visible: true, width: 0, height: 0, ...o,
    properties: Object.entries(o.properties ?? {}).map(([name, value]) => ({
      name, type: typeof value === "number" ? "float" : typeof value === "boolean" ? "bool" : "string", value,
    })),
  });

// Buildings: top-left tile + door column offset (door is on the bottom row)
const PLACE = {
  // main island: the big three side by side, 3-tile gaps, Facebook in the middle a few steps from spawn
  youtube: { x: 25, y: 31, door: 1 },
  facebook: { x: 31, y: 31, door: 1 },
  tiktok: { x: 38, y: 31, door: 1 },
  instagram: { x: 8, y: 31, door: 1 },
  x: { x: 56, y: 31, door: 1 },
  github: { x: 35, y: 8, door: 1 },
  website: { x: 6, y: 16, door: 1 },
  threads: { x: 56, y: 16, door: 1 },
  // top of the main island, straight above Facebook Hall (a wider gap than between the big three)
  about: { x: 31, y: 22, door: 1 },
};
const plazas = [];
const occupied = new Uint8Array(W * H); // buildings, plazas, roads, bridges → no trees/decor
for (const [id, pl] of Object.entries(PLACE)) {
  const [, , w, h] = BUILDINGS[id];
  walk(pl.x, pl.y, pl.x + w - 1, pl.y + h - 1, 1);
  for (let y = pl.y; y < pl.y + h; y++) for (let x = pl.x; x < pl.x + w; x++) occupied[idx(x, y)] = 1;
  const dx = pl.x + pl.door;
  const plaza = [dx - 1, pl.y + h, dx + 1, pl.y + h + 1];
  rect9(detail, ...plaza, "floor", 0, 7);
  plazas.push(plaza);
  for (let y = plaza[1]; y <= plaza[3]; y++) for (let x = plaza[0]; x <= plaza[2]; x++) {
    occupied[idx(x, y)] = 1;
    if (road[idx(x, y)] === 1) set(roadsL, x, y, 0);
  }
  obj({ name: id, type: "building", x: pl.x * T, y: pl.y * T, width: w * T, height: h * T, properties: { platform: id, doorX: dx, doorY: pl.y + h } });
  obj({ name: `sign-${id}`, type: "sign", x: (dx + 2) * T + 2, y: (pl.y + h) * T + 4, properties: { platform: id } });
  occupied[idx(dx + 2, pl.y + h)] = 1;
}
for (let i = 0; i < W * H; i++) if (road[i] || isBridge(i % W, Math.floor(i / W))) occupied[i] = 1;

// Spawn + jeepney (main beach)
obj({ name: "spawn", type: "spawn", x: 32 * T + 8, y: 38 * T + 8 });
obj({ name: "jeepney", type: "jeepney", x: 34 * T, y: 37 * T, width: 48, height: 32 });
walk(34, 38, 36, 38, 1);
for (let x = 34; x <= 36; x++) for (let y = 37; y <= 38; y++) occupied[idx(x, y)] = 1;

// Hidden beach: chest + locked bridge
obj({ name: "chest", type: "chest", x: 70 * T + 8, y: 35 * T + 8 });
walk(70, 35, 70, 35, 1);
occupied[idx(70, 35)] = 1;
const secretTiles = bridges.filter((b) => b.secret).map((b) => [b.x, b.y]);
obj({ name: "secret-bridge", type: "secret-bridge", x: 63 * T, y: 35 * T, width: 3 * T, height: 3 * T, properties: { tiles: JSON.stringify(secretTiles) } });

const free = (x, y) => inMap(x, y) && !blocked[idx(x, y)] && !occupied[idx(x, y)];

// Trees & rocks (blocked at base tile)
const trees = [
  // main
  ["coconut", 21, 38], ["coconut", 25, 38], ["coconut", 28, 38], ["coconut", 39, 38], ["coconut", 42, 38], ["coconut", 45, 38],
  ["coconut", 20, 22], ["coconut", 46, 22], ["tree", 21, 23], ["tree", 45, 23], ["tree", 29, 29],
  ["bamboo", 30, 23], ["bamboo", 34, 23], ["bamboo", 30, 32], ["bamboo", 35, 32], ["rock", 42, 30], ["boulder", 25, 28],
  // instagram islet
  ["coconut", 5, 38], ["coconut", 14, 38], ["coconut", 5, 29], ["tree", 14, 31], ["rock", 6, 36],
  // x islet
  ["coconut", 52, 38], ["coconut", 61, 38], ["coconut", 61, 29], ["tree", 52, 30], ["rock", 60, 32],
  // github islet (dojo garden)
  ["coconut", 30, 16], ["coconut", 42, 16], ["coconut", 30, 6], ["coconut", 42, 6], ["bamboo", 33, 9], ["bamboo", 33, 10], ["bamboo", 40, 9], ["bamboo", 40, 10],
  // blog islet
  ["coconut", 5, 23], ["coconut", 14, 23], ["coconut", 5, 14], ["tree", 13, 15], ["rock", 12, 18],
  // threads islet
  ["coconut", 52, 23], ["coconut", 61, 23], ["coconut", 61, 14], ["tree", 52, 15], ["rock", 59, 22],
  // hidden beach
  ["coconut", 74, 32], ["coconut", 67, 38], ["coconut", 74, 38], ["rock", 72, 33],
];
for (const [kind, tx, ty] of trees) {
  if (!free(tx, ty)) throw new Error(`tree ${kind} not on free tile ${tx},${ty}`);
  obj({ name: kind, type: "tree", x: tx * T + (kind === "boulder" ? 16 : 8), y: (ty + 1) * T, properties: { kind } });
  walk(tx, ty, tx, ty, 1);
  if (kind === "boulder") walk(tx + 1, ty, tx + 1, ty, 1);
  occupied[idx(tx, ty)] = 1;
}

// Decor (flowers/tufts) on free grass
const DECOR = [gid("nature", 0, 11), gid("nature", 1, 11), gid("nature", 3, 11), gid("nature", 4, 10), gid("nature", 5, 10), gid("nature", 8, 10), gid("nature", 2, 11)];
const onGrass = (x, y) =>
  Object.values(ISLANDS).some(([, g]) => g && x > g[0] && x < g[2] && y > g[1] && y < g[3]);
let seed = 11;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (let i = 0; i < 260; i++) {
  const x = Math.floor(rnd() * W);
  const y = Math.floor(rnd() * H);
  if (onGrass(x, y) && free(x, y) && !detail[idx(x, y)] && rnd() < 0.55) set(detail, x, y, DECOR[Math.floor(rnd() * DECOR.length)]);
}

// Coins
const COINS = [
  [22, 30], [44, 30], [36, 24], [26, 26], [40, 26], [29, 25], [28, 37], [45, 37], [24, 36], // main
  [17, 36], [49, 36], [36, 19], [54, 26], [12, 26], // bridges
  [7, 30], [13, 33], // instagram
  [54, 31], [60, 35], // x
  [53, 18], [60, 17], // threads
  [32, 13], [40, 13], [36, 7], // github
  [11, 16], [6, 22], // blog
  [69, 37], // hidden beach
];
for (const [x, y] of COINS) {
  if (blocked[idx(x, y)]) throw new Error(`coin on blocked tile ${x},${y}`);
  obj({ name: "coin", type: "coin", x: x * T + 8, y: y * T + 8 });
}

// Enemies — patrol areas kept off bridges and ≥2 tiles from doors
const ENEMIES = [
  // main (12) — none on the spawn beach in front of the hall
  ["lamok", 21, 22, 3, 2], ["lamok", 43, 22, 3, 2], ["ipis", 24, 24, 3, 2], ["ipis", 27, 22, 2, 2], ["lamok", 33, 27, 3, 2], ["ipis", 37, 23, 2, 2],
  ["lamok", 24, 29, 3, 2], ["ipis", 42, 28, 2, 2], ["ipis", 21, 37, 2, 2], ["lamok", 42, 37, 3, 1], ["lamok", 29, 27, 2, 2], ["ipis", 45, 31, 1, 3],
  // instagram (5)
  ["lamok", 5, 29, 2, 2], ["ipis", 13, 30, 2, 2], ["lamok", 5, 36, 2, 2], ["ipis", 10, 37, 3, 1], ["lamok", 6, 32, 1, 2],
  // x (5)
  ["lamok", 52, 32, 2, 2], ["ipis", 59, 29, 2, 2], ["lamok", 59, 37, 3, 2], ["ipis", 52, 37, 2, 2], ["lamok", 56, 29, 2, 1],
  // github (5)
  ["lamok", 30, 7, 3, 2], ["lamok", 39, 7, 2, 2], ["ipis", 31, 13, 3, 2], ["ipis", 39, 14, 2, 2], ["lamok", 34, 15, 2, 1],
  // blog (5)
  ["lamok", 10, 14, 3, 2], ["ipis", 13, 19, 2, 2], ["lamok", 5, 22, 2, 1], ["lamok", 5, 16, 1, 2], ["ipis", 9, 23, 2, 1],
  // threads (4)
  ["lamok", 52, 16, 2, 2], ["ipis", 60, 14, 2, 2], ["lamok", 58, 22, 3, 1], ["ipis", 52, 20, 1, 2],
];
// guard: patrols stay ≥2 tiles from every door and never cover a bridge
const doorTiles = Object.values(PLACE).map((pl) => [pl.x + pl.door, pl.y + 3]);
for (const [kind, x, y, w, h] of ENEMIES) {
  for (const [dx, dy] of doorTiles) {
    const gapX = dx < x ? x - dx : dx > x + w - 1 ? dx - (x + w - 1) : 0;
    const gapY = dy < y ? y - dy : dy > y + h - 1 ? dy - (y + h - 1) : 0;
    if (Math.max(gapX, gapY) < 2) throw new Error(`${kind} at ${x},${y} too close to door ${dx},${dy}`);
  }
  if (bridges.some((b) => b.x >= x && b.x < x + w && b.y >= y && b.y < y + h)) throw new Error(`${kind} at ${x},${y} on a bridge`);
}
for (const [kind, x, y, w, h] of ENEMIES)
  obj({ name: kind, type: "enemy", x: x * T, y: y * T, width: w * T, height: h * T, properties: { kind } });

const collision = Array.from(blocked, (b) => (b ? gid("water", 1, 1) : 0));
for (const [x, y] of secretTiles) collision[idx(x, y)] = gid("water", 1, 1);

const tileLayer = (id, name, data, visible = true) => ({ id, name, type: "tilelayer", width: W, height: H, x: 0, y: 0, opacity: 1, visible, data });
const map = {
  type: "map", version: "1.10", tiledversion: "1.10.2", orientation: "orthogonal", renderorder: "right-down",
  width: W, height: H, tilewidth: T, tileheight: T, infinite: false, nextlayerid: 8, nextobjectid: oid,
  layers: [
    tileLayer(1, "water", water),
    tileLayer(2, "ground", ground),
    tileLayer(3, "detail", detail),
    tileLayer(4, "roads", roadsL),
    tileLayer(5, "secret", secretL),
    tileLayer(6, "collision", collision, false),
    { id: 7, name: "objects", type: "objectgroup", draworder: "topdown", x: 0, y: 0, opacity: 1, visible: true, objects },
  ],
  tilesets: TILESETS.map((t) => ({
    firstgid: t.firstgid, name: t.name, image: t.image, imagewidth: t.w, imageheight: t.h,
    tilewidth: T, tileheight: T, columns: t.cols, tilecount: t.count, margin: 0, spacing: 0,
  })),
};

// Floor tileset is 417px tall in the pack; trim to whole tiles for Tiled/Phaser.
await sharp(p("Backgrounds/Tilesets/TilesetFloor.png")).extract({ left: 0, top: 0, width: 352, height: 416 }).png().toFile(out("tiles/floor.png") + ".tmp");
fs.renameSync(out("tiles/floor.png") + ".tmp", out("tiles/floor.png"));
fs.writeFileSync(out("map/island.json"), JSON.stringify(map));

// ---------------------------------------------------------------- island preview (for OG image)
{
  const tileCache = new Map();
  const tileBuf = async (g) => {
    if (tileCache.has(g)) return tileCache.get(g);
    const ts = [...TILESETS].reverse().find((t) => g >= t.firstgid);
    const i = g - ts.firstgid;
    const b = await sharp(path.join(OUT, "tiles", path.basename(ts.image)))
      .extract({ left: (i % ts.cols) * T, top: Math.floor(i / ts.cols) * T, width: T, height: T })
      .png()
      .toBuffer();
    tileCache.set(g, b);
    return b;
  };
  const comps = [];
  for (const l of [water, ground, detail, roadsL])
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const g = l[y * W + x];
        if (g) comps.push({ input: await tileBuf(g), left: x * T, top: y * T });
      }
  const img = (f) => path.join(OUT, f);
  const sorted = [...objects].sort((a, b) => a.y - b.y);
  for (const o of sorted) {
    if (o.type === "building") comps.push({ input: img(`buildings/${o.name}.png`), left: o.x, top: o.y });
    if (o.type === "jeepney") comps.push({ input: img("sprites/jeepney.png"), left: o.x, top: o.y });
    if (o.type === "sign") comps.push({ input: img(`sprites/sign-${o.name.slice(5)}.png`), left: o.x - 10, top: o.y });
    if (o.type === "tree") {
      const kind = o.properties.find((pp) => pp.name === "kind").value;
      const m = await sharp(img(`sprites/${kind}.png`)).metadata();
      comps.push({ input: img(`sprites/${kind}.png`), left: Math.round(o.x - m.width / 2), top: Math.round(o.y + 2 - m.height) });
    }
    if (o.type === "spawn")
      comps.push({ input: await sharp(img("sprites/pogi.png")).extract({ left: 0, top: 0, width: 16, height: 24 }).png().toBuffer(), left: o.x - 8, top: o.y - 12 });
  }
  const full = await sharp({ create: { width: W * T, height: H * T, channels: 4, background: "#5ec8ff" } })
    .composite(comps)
    .png()
    .toBuffer();
  await sharp(full).png().toFile(path.resolve("assets/island-full.png"));
  // OG crop: the main island (the big three, spawn, roads), 1200×630 nearest-neighbour
  const cw = 40 * T;
  const ch = Math.round((cw * 630) / 1200);
  await sharp(full)
    .extract({ left: 13 * T, top: 21 * T, width: cw, height: ch })
    .resize(1200, 630, { kernel: "nearest" })
    .png()
    .toFile(path.resolve("assets/og-island.png"));
}

console.log("✓ game assets →", path.relative(process.cwd(), OUT));
