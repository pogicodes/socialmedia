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
  facebook: [25, 10, 4, 4], // two-storey hall → Barangay Hall
  youtube: [16, 0, 3, 3], // shop with signboard → Sinehan
  tiktok: [19, 0, 4, 3], // lantern bar → Videoke Stage
  instagram: [23, 0, 3, 3], // round adobe → Photo Booth
  x: [3, 7, 3, 3], // thatched nipa hut → Chismis Corner
  github: [12, 0, 4, 3], // red-roof temple → Code Dojo
};
await Promise.all([
  ...Object.entries(BUILDINGS).map(([id, [c, r, w, h]]) => crop(HOUSE, `buildings/${id}.png`, c, r, w, h)),
  crop(HOUSE, "sprites/dojo-sign.png", 4, 4, 2, 1),
  crop(HOUSE, "sprites/banner-red.png", 22, 20, 1, 2),
  crop(HOUSE, "sprites/banner-green.png", 24, 20, 1, 2),
  crop(NATURE, "sprites/tree.png", 6, 8, 2, 2),
  crop(NATURE, "sprites/bush-tree.png", 0, 0, 2, 2),
  crop(NATURE, "sprites/bamboo.png", 11, 8, 1, 3),
  crop(NATURE, "sprites/rock.png", 13, 9, 1, 1),
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
  const H = 32;
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
  // bridges (row 1): col0 vertical (walk N–S), col1 horizontal (walk E–W)
  const WOOD = [176, 120, 70];
  const SEAM = [120, 78, 44];
  const RAIL = [86, 54, 30];
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      // vertical
      const v = x <= 1 || x >= 14 ? RAIL : y % 4 === 3 ? SEAM : WOOD;
      put(x, 16 + y, v);
      // horizontal
      const h = y <= 1 || y >= 14 ? RAIL : x % 4 === 3 ? SEAM : WOOD;
      put(16 + x, 16 + y, h);
    }
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out("tiles/custom.png"));
}

// ---------------------------------------------------------------- map (Tiled JSON)
const W = 45;
const H = 50;
const TILESETS = [
  { name: "water", image: "../tiles/water.png", w: 448, h: 272 },
  { name: "field", image: "../tiles/field.png", w: 80, h: 240 },
  { name: "floor", image: "../tiles/floor.png", w: 352, h: 416 },
  { name: "nature", image: "../tiles/nature.png", w: 384, h: 336 },
  { name: "custom", image: "../tiles/custom.png", w: 256, h: 32 },
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
const set = (l, x, y, v) => inMap(x, y) && (l[y * W + x] = v);
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
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y)) blocked[y * W + x] = v;
};

// Main island
rect9(ground, 2, 11, 33, 48, "field", 0, 0); // beach
rect9(ground, 3, 12, 32, 43, "field", 0, 3); // grass
walk(3, 12, 32, 47);
// Dojo islet (north)
rect9(ground, 11, 1, 23, 7, "field", 0, 0);
rect9(ground, 12, 2, 22, 6, "field", 0, 3);
walk(12, 2, 22, 6);
walk(12, 7, 22, 7);
// Hidden beach islet (east)
rect9(ground, 37, 22, 43, 32, "field", 0, 0);
walk(38, 23, 42, 31);

// Pond
const pond = [4, 35, 6, 38];
rect9(ground, ...pond, "water", 0, 6);
walk(...pond, 1);

// Roads: list of orthogonal segments [x0,y0,x1,y1]
const road = new Uint8Array(W * H);
const seg = (x0, y0, x1, y1) => {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) road[y * W + x] = 1;
};
seg(17, 40, 17, 46); // spawn → Barangay Hall plaza
seg(8, 41, 27, 41); // boulevard
seg(8, 13, 8, 41); // west road
seg(27, 13, 27, 41); // east road
seg(8, 13, 27, 13); // north road
seg(17, 11, 17, 13); // to dojo bridge
seg(17, 7, 17, 7); // dojo islet landing
seg(9, 34, 9, 34); // → Sinehan plaza
seg(24, 34, 26, 34); // → Videoke plaza
seg(9, 23, 9, 23); // → Photo Booth plaza
seg(24, 23, 26, 23); // → Chismis plaza
seg(28, 27, 33, 27); // → secret bridge
seg(37, 27, 39, 27); // hidden beach landing → chest
const bridgeMain = [[17, 8], [17, 9], [17, 10]];
const bridgeSecret = [[34, 27], [35, 27], [36, 27]];
for (const [x, y] of bridgeMain) road[y * W + x] = 2;
// every road/bridge tile is walkable (even across beach edges)
for (let i = 0; i < W * H; i++) if (road[i]) blocked[i] = 0;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    if (road[y * W + x] !== 1) continue;
    const r = (xx, yy) => inMap(xx, yy) && road[yy * W + xx] > 0;
    const sec = (xx, yy) => bridgeSecret.some(([bx, by]) => bx === xx && by === yy);
    const mask = (r(x, y - 1) ? 1 : 0) | (r(x + 1, y) || sec(x + 1, y) ? 2 : 0) | (r(x, y + 1) ? 4 : 0) | (r(x - 1, y) || sec(x - 1, y) ? 8 : 0);
    set(roadsL, x, y, gid("custom", mask, 0));
  }
for (const [x, y] of bridgeMain) set(roadsL, x, y, gid("custom", 0, 1));
for (const [x, y] of bridgeSecret) set(secretL, x, y, gid("custom", 1, 1)); // hidden until unlocked; stays blocked

const objects = [];
let oid = 1;
const obj = (o) =>
  objects.push({
    id: oid++, rotation: 0, visible: true, width: 0, height: 0, ...o,
    properties: Object.entries(o.properties ?? {}).map(([name, value]) => ({
      name, type: typeof value === "number" ? "float" : typeof value === "boolean" ? "bool" : "string", value,
    })),
  });

// Buildings: top-left tile, door column offset
const PLACE = {
  facebook: { x: 16, y: 35, door: 1 }, // right in front of spawn
  youtube: { x: 10, y: 30, door: 1 },
  tiktok: { x: 21, y: 30, door: 1 },
  instagram: { x: 10, y: 19, door: 1 },
  x: { x: 21, y: 19, door: 1 },
  github: { x: 16, y: 2, door: 1 }, // north islet, across the bridge
};
const plazas = [];
for (const [id, pl] of Object.entries(PLACE)) {
  const [, , w, h] = BUILDINGS[id];
  walk(pl.x, pl.y, pl.x + w - 1, pl.y + h - 1, 1);
  const dx = pl.x + pl.door;
  rect9(detail, dx - 1, pl.y + h, dx + 1, pl.y + h + 1, "floor", 0, 7);
  plazas.push([dx - 1, pl.y + h, dx + 1, pl.y + h + 1]);
  obj({ name: id, type: "building", x: pl.x * T, y: pl.y * T, width: w * T, height: h * T, properties: { platform: id, doorX: dx, doorY: pl.y + h } });
  obj({ name: `sign-${id}`, type: "sign", x: (dx + 2) * T + 2, y: (pl.y + h) * T + 4, properties: { platform: id } });
}
const onPlaza = (x, y) => plazas.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
// roads don't paint over plazas
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (onPlaza(x, y) && road[y * W + x] === 1) set(roadsL, x, y, 0);

// Jeepney + spawn (beach)
obj({ name: "jeepney", type: "jeepney", x: 19 * T, y: 44 * T, width: 48, height: 32 });
walk(19, 45, 21, 45, 1);
obj({ name: "spawn", type: "spawn", x: 17 * T + 8, y: 45 * T + 8 });

// Hidden beach: chest + barrier on the secret bridge
obj({ name: "chest", type: "chest", x: 40 * T + 8, y: 27 * T + 8 });
walk(40, 27, 40, 27, 1);
obj({ name: "secret-bridge", type: "secret-bridge", x: 34 * T, y: 27 * T, width: 3 * T, height: T, properties: { tiles: JSON.stringify(bridgeSecret) } });

// Trees (blocked trunk tile)
const trees = [
  ["coconut", 4, 45], ["coconut", 9, 46], ["coconut", 13, 45], ["coconut", 24, 46], ["coconut", 28, 45], ["coconut", 31, 46],
  ["coconut", 4, 14], ["coconut", 31, 15], ["coconut", 4, 28], ["coconut", 31, 31], ["coconut", 13, 3], ["coconut", 21, 3],
  ["coconut", 39, 24], ["coconut", 42, 30], ["coconut", 38, 30],
  ["tree", 13, 15], ["tree", 22, 15], ["tree", 13, 26], ["tree", 22, 26], ["bush-tree", 5, 20], ["bush-tree", 29, 37],
  ["bamboo", 14, 37], ["bamboo", 21, 37], ["bamboo", 5, 31], ["bamboo", 30, 22], ["bamboo", 30, 23],
  ["rock", 18, 22], ["rock", 11, 39], ["rock", 25, 39], ["rock", 41, 25],
];
for (const [kind, tx, ty] of trees) {
  if (road[ty * W + tx]) throw new Error(`tree on road at ${tx},${ty}`);
  obj({ name: kind, type: "tree", x: tx * T + 8, y: (ty + 1) * T, properties: { kind } });
  walk(tx, ty, tx, ty, 1);
}

// Decor (flowers/tufts) off roads & plazas
const DECOR = [gid("nature", 0, 11), gid("nature", 1, 11), gid("nature", 3, 11), gid("nature", 4, 10), gid("nature", 5, 10), gid("nature", 8, 10), gid("nature", 2, 11)];
let seed = 11;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (let i = 0; i < 90; i++) {
  const x = 3 + Math.floor(rnd() * 30);
  const y = 12 + Math.floor(rnd() * 31);
  if (!blocked[y * W + x] && !detail[y * W + x] && !road[y * W + x]) set(detail, x, y, DECOR[Math.floor(rnd() * DECOR.length)]);
}

// Coins (20): along roads, fields, islets
const COINS = [
  [17, 43], [12, 41], [23, 41], [8, 37], [27, 37], [15, 33], [19, 27], [8, 29], [27, 29], [12, 24],
  [23, 24], [17, 17], [8, 17], [27, 17], [14, 13], [20, 13], [17, 5], [13, 5], [21, 5], [40, 29],
];
for (const [x, y] of COINS) {
  if (blocked[y * W + x]) throw new Error(`coin on blocked tile ${x},${y}`);
  obj({ name: "coin", type: "coin", x: x * T + 8, y: y * T + 8 });
}

// Enemies (patrol areas ≥2 tiles from doors)
const ENEMIES = [
  ["lamok", 11, 14, 4, 3], ["lamok", 19, 25, 5, 3], ["lamok", 23, 36, 3, 3],
  ["ipis", 18, 15, 4, 4], ["ipis", 12, 36, 2, 3], ["ipis", 13, 8 - 2, 3, 1],
];
for (const [kind, x, y, w, h] of ENEMIES)
  obj({ name: kind, type: "enemy", x: x * T, y: y * T, width: w * T, height: h * T, properties: { kind } });

const collision = Array.from(blocked, (b) => (b ? gid("water", 1, 1) : 0));
for (const [x, y] of bridgeSecret) collision[y * W + x] = gid("water", 1, 1);

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
  // OG crop: south part of the main island (spawn, Barangay Hall, roads), 1200×630 nearest-neighbour
  const cw = 28 * T;
  const ch = Math.round((cw * 630) / 1200);
  await sharp(full)
    .extract({ left: 4 * T, top: 47 * T - ch, width: cw, height: ch })
    .resize(1200, 630, { kernel: "nearest" })
    .png()
    .toFile(path.resolve("assets/og-island.png"));
}

console.log("✓ game assets →", path.relative(process.cwd(), OUT));
