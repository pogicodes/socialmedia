import * as Phaser from "phaser";
import type { PlatformId } from "@/lib/types";
import { bridge } from "./bridge";
import { GuideArrow, type GuideTarget } from "./guide";
import { findPath } from "./pathfind";
import type { RoomData } from "./RoomScene";
import { BASE_HEARTS, damage, store } from "./state";

export const T = 16;
export const SPEED = 72;
/** Pogi is 16×24; his feet sit 9px below the sprite centre. */
export const FEET = 9;
const BASE = "/game";
export type Dir = "down" | "up" | "left" | "right";
export const DIR_COL: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 };

/** Integer zoom (crisp pixels): ~8 tiles across a phone, ~13 tiles tall on wide screens. */
export function zoomFor(width: number, height: number) {
  return Phaser.Math.Clamp(Math.round(Math.min(width / (T * 8), height / (T * 13))), 2, 6);
}

/** Writes the top of Pogi's head in screen px to the bridge (the action hint follows it). */
export function reportAnchor(scene: Phaser.Scene, player: Phaser.GameObjects.Sprite) {
  const cam = scene.cameras.main;
  const v = cam.worldView;
  bridge.anchor.x = (player.x - v.x) * cam.zoom;
  bridge.anchor.y = (player.y - 12 - v.y) * cam.zoom;
}

/** After everything is done: what a dev + content creator does all day. */
const CREATOR_LINES = [
  "Nag-eedit pa ako ng vlog…",
  "Render 99%… sana 'di mag-crash.",
  "git push… sa Friday? Bahala na.",
  "Thumbnail muna bago code.",
  "Kape muna. ☕",
  "Copy-paste developer, proud!",
  "Salamat StackOverflow at ChatGPT.",
  "May bagong short mamaya, abangan!",
  "Bug ba 'yan o feature?",
  "Nagre-reply sa comments, saglit.",
  "Ship it! 🚀",
  "Script ng next video, loading…",
];

interface Door {
  platform: PlatformId;
  tx: number;
  ty: number;
  zone: Phaser.Geom.Rectangle;
  building: Phaser.Geom.Rectangle;
  sprite: Phaser.GameObjects.Image;
}

interface Enemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: "lamok" | "ipis";
  area: Phaser.Geom.Rectangle;
  t: number;
  next: number;
  vx: number;
  vy: number;
}

type TiledProp = { name: string; value: unknown };
const prop = (o: Phaser.Types.Tilemaps.TiledObject, name: string) =>
  (o.properties as TiledProp[] | undefined)?.find((p) => p.name === name)?.value;

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private dir: Dir = "down";
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private map!: Phaser.Tilemaps.Tilemap;
  private doors: Door[] = [];
  private enemies: Enemy[] = [];
  private path: { x: number; y: number }[] = [];
  private pathTarget: PlatformId | "chest" | null = null;
  private currentDoor: PlatformId | null = null;
  private invincibleUntil = 0;
  private knockUntil = 0;
  private paused = false;
  private spawn = { x: 0, y: 0 };
  private lastMove = 0;
  private bubble?: Phaser.GameObjects.Text;
  private stamps = new Map<PlatformId, Phaser.GameObjects.Text>();
  private music?: Phaser.Sound.BaseSound;
  private soundOn = false;
  private font = "monospace";
  private unsubs: (() => void)[] = [];
  private saveTimer = 0;
  private spoke = false;
  private roads!: Phaser.Tilemaps.TilemapLayer;
  private secretLayer!: Phaser.Tilemaps.TilemapLayer;
  private secretTiles: [number, number][] = [];
  private unlocked = false;
  private lockLabel?: Phaser.GameObjects.Text;
  private chest?: Phaser.GameObjects.Sprite;
  private chestZone?: Phaser.Geom.Rectangle;
  private inChest = false;
  private prompt: string | null = null;
  private arrow!: GuideArrow;
  /** "Hidden beach" was picked while inside a room: walk there once back outside. */
  private chestAfterWake = false;

  constructor() {
    super("world");
  }

  preload() {
    this.load.on("progress", (v: number) => bridge.emit("progress", v));
    this.load.tilemapTiledJSON("island", `${BASE}/map/island.json`);
    for (const t of ["water", "field", "floor", "nature", "custom"]) this.load.image(`tiles-${t}`, `${BASE}/tiles/${t}.png`);
    this.load.spritesheet("pogi", `${BASE}/sprites/pogi.png`, { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet("chest", `${BASE}/sprites/chest.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("lamok", `${BASE}/sprites/lamok.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("ipis", `${BASE}/sprites/ipis.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("coin", `${BASE}/sprites/coin.png`, { frameWidth: 10, frameHeight: 10 });
    this.load.spritesheet("smoke", `${BASE}/sprites/smoke.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("ripple", `${BASE}/sprites/ripple.png`, { frameWidth: 16, frameHeight: 16 });
    for (const id of ["facebook", "youtube", "tiktok", "instagram", "x", "github", "website", "threads"]) {
      this.load.image(`building-${id}`, `${BASE}/buildings/${id}.png`);
      this.load.image(`sign-${id}`, `${BASE}/sprites/sign-${id}.png`);
    }
    for (const k of ["jeepney", "coconut", "tree", "bush-tree", "bamboo", "rock", "boulder", "dojo-sign"])
      this.load.image(k, `${BASE}/sprites/${k}.png`);
    for (const a of ["music", "coin", "hit", "heal", "open", "close", "clear", "gameover", "step", "complete"])
      this.load.audio(a, `${BASE}/audio/${a}.mp3`);
  }

  create() {
    this.font =
      getComputedStyle(document.documentElement).getPropertyValue("--font-press-start").trim() || "monospace";

    // ---------------------------------------------------------- map
    const map = (this.map = this.make.tilemap({ key: "island" }));
    const sets = ["water", "field", "floor", "nature", "custom"].map((n) => map.addTilesetImage(n, `tiles-${n}`)!);
    map.createLayer("water", sets);
    map.createLayer("ground", sets);
    this.roads = map.createLayer("roads", sets) as Phaser.Tilemaps.TilemapLayer;
    map.createLayer("detail", sets);
    this.secretLayer = map.createLayer("secret", sets) as Phaser.Tilemaps.TilemapLayer;
    this.secretLayer.setVisible(false);
    this.collision = map.createLayer("collision", sets) as Phaser.Tilemaps.TilemapLayer;
    this.collision.setVisible(false);
    this.collision.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // ---------------------------------------------------------- anims
    const anim = (key: string, sheet: string, frames: number[], rate: number, repeat = -1) =>
      this.anims.exists(key) || this.anims.create({ key, frames: frames.map((frame) => ({ key: sheet, frame })), frameRate: rate, repeat });
    for (const [d, c] of Object.entries(DIR_COL)) anim(`walk-${d}`, "pogi", [c, 4 + c, 8 + c, 12 + c], 8);
    anim("lamok", "lamok", [0, 1], 10);
    anim("ipis", "ipis", [0, 1], 8);
    anim("coin", "coin", [0, 1, 2, 3], 8);
    anim("ripple", "ripple", [0, 1, 2, 3], 4);
    anim("smoke", "smoke", [0, 1, 2, 3, 4, 5], 16, 0);

    // water sparkle
    for (let i = 0; i < 26; i++) {
      const x = Phaser.Math.Between(0, map.width - 1);
      const y = Phaser.Math.Between(0, map.height - 1);
      if (x > 1 && x < map.width - 2 && y > 1 && y < map.height - 2) continue;
      this.add.sprite(x * T + 8, y * T + 8, "ripple").play({ key: "ripple", startFrame: i % 4 }).setAlpha(0.7);
    }

    // ---------------------------------------------------------- objects
    const objects = map.getObjectLayer("objects")?.objects ?? [];
    const coins = this.physics.add.staticGroup();
    let coinIdx = 0;
    const collected = new Set(store.get().collected);

    for (const o of objects) {
      const x = o.x ?? 0;
      const y = o.y ?? 0;
      switch (o.type) {
        case "building": {
          const id = prop(o, "platform") as PlatformId;
          const img = this.add.image(x, y, `building-${id}`).setOrigin(0, 0).setDepth(y + (o.height ?? 0));
          const dx = prop(o, "doorX") as number;
          const dy = prop(o, "doorY") as number;
          this.doors.push({
            platform: id,
            tx: dx,
            ty: dy,
            zone: new Phaser.Geom.Rectangle(dx * T - 8, dy * T - 2, T * 2, T + 4),
            building: new Phaser.Geom.Rectangle(x, y, o.width ?? 0, o.height ?? 0),
            sprite: img,
          });
          if (id === "github") this.add.image(x + 32, y + 30, "dojo-sign").setDepth(y + (o.height ?? 0) + 1);
          break;
        }
        case "sign":
          this.add.image(x, y + 20, `sign-${prop(o, "platform")}`).setOrigin(0.5, 1).setDepth(y + 20);
          break;
        case "jeepney":
          this.add.image(x, y, "jeepney").setOrigin(0, 0).setDepth(y + 28);
          break;
        case "spawn":
          this.spawn = { x, y };
          break;
        case "tree":
          this.add.image(x, y + 2, prop(o, "kind") as string).setOrigin(0.5, 1).setDepth(y);
          break;
        case "chest":
          this.chest = this.add.sprite(x, y, "chest", 0).setDepth(y + 6);
          this.chestZone = new Phaser.Geom.Rectangle(x - 24, y - 20, 48, 40);
          break;
        case "secret-bridge":
          this.secretTiles = JSON.parse(prop(o, "tiles") as string);
          this.lockLabel = this.add
            .text(x + (o.width ?? 0) / 2, y + 2, "🔒 CLEAR ALL WORLDS", {
              fontFamily: this.font,
              fontSize: "6px",
              color: "#fff",
              stroke: "#000",
              strokeThickness: 3,
              resolution: 4,
            })
            .setOrigin(0.5, 0)
            .setDepth(9_000);
          break;
        case "coin": {
          const idx = coinIdx++;
          if (collected.has(idx)) break;
          const c = coins.create(x, y, "coin") as Phaser.Physics.Arcade.Sprite;
          c.play({ key: "coin", startFrame: idx % 4 }).setDepth(y).setData("idx", idx);
          this.tweens.add({ targets: c, y: y - 2, yoyo: true, repeat: -1, duration: 600, ease: "Sine.inOut", delay: idx * 70 });
          break;
        }
        case "enemy": {
          const kind = prop(o, "kind") as "lamok" | "ipis";
          const area = new Phaser.Geom.Rectangle(x, y, o.width ?? 32, o.height ?? 32);
          const s = this.physics.add.sprite(area.centerX, area.centerY, kind).play(kind);
          (s.body as Phaser.Physics.Arcade.Body).setSize(10, 8).setOffset(3, 5);
          this.enemies.push({ sprite: s, kind, area, t: Math.random() * 10, next: 0, vx: 0, vy: 0 });
          break;
        }
      }
    }

    // ---------------------------------------------------------- player
    const pos = store.get().pos ?? { x: this.spawn.x, y: this.spawn.y - FEET };
    this.player = this.physics.add.sprite(pos.x, pos.y, "pogi", 0);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(10, 6).setOffset(3, 18);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.collision);
    this.physics.add.overlap(this.player, coins, (_p, c) => this.collectCoin(c as Phaser.Physics.Arcade.Sprite));
    for (const e of this.enemies)
      this.physics.add.overlap(this.player, e.sprite, () => this.hurt(e.sprite));

    for (const id of store.get().cleared) this.stamp(id, false);
    if (this.doors.every((d) => store.get().cleared.includes(d.platform))) this.unlock(false);

    // ---------------------------------------------------------- camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setBackgroundColor("#5ec8ff");
    this.fitZoom();
    this.scale.on("resize", this.fitZoom, this);
    this.arrow = new GuideArrow(this);
    this.events.on("wake", (_: unknown, data: { platform: PlatformId }) => this.exitRoom(data.platform));

    // ---------------------------------------------------------- input
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER", false) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on("keydown-SPACE", () => this.interact());
    kb.on("keydown-ENTER", () => this.interact());

    // ---------------------------------------------------------- bridge
    this.unsubs.push(
      bridge.on("tap", ({ x, y }) => this.tapTo(x, y)),
      bridge.on("interact", () => this.interact()),
      bridge.on("pause", (p) => this.setPaused(p)),
      bridge.on("respawn", () => this.respawn()),
      bridge.on("revive", () => this.revive()),
      bridge.on("newgame", () => this.scene.restart()),
      bridge.on("sound", (on) => this.setSound(on)),
      bridge.on("enterRoom", (id) => this.goto(id)),
      bridge.on("healed", (n) => this.floatText(`+${n} ❤`, "#ff5c8a", "Ayos!")),
      bridge.on("cleared", (id) => this.stamp(id, true)),
      bridge.on("complete", () => this.unlock(true)),
      bridge.on("gotoSecret", () => (this.sys.isSleeping() ? (this.chestAfterWake = true) : this.walkToChest())),
    );
    this.events.once("shutdown", () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.scale.off("resize", this.fitZoom, this);
      this.scene.stop("room");
      this.doors = [];
      this.enemies = [];
      this.stamps.clear();
      this.music?.stop();
      this.music = undefined;
      this.path = [];
      this.pathTarget = null;
      this.currentDoor = null;
      this.secretTiles = [];
      this.unlocked = false;
      this.chest = undefined;
      this.chestZone = undefined;
      this.inChest = false;
      this.prompt = null;
      this.chestAfterWake = false;
      this.paused = false;
      this.spoke = false;
    });

    bridge.emit("ready");
  }

  // ============================================================ helpers

  private fitZoom() {
    if (this.sys.isSleeping()) return; // the room scene owns the screen; re-fit on wake
    this.cameras.main.setZoom(zoomFor(this.scale.width, this.scale.height));
  }

  private isBlocked = (tx: number, ty: number) => {
    const t = this.collision.getTileAt(tx, ty);
    return !!t && t.index !== -1;
  };

  private tileOf(x: number, y: number) {
    return { x: Math.floor(x / T), y: Math.floor(y / T) };
  }

  private feet() {
    return { x: this.player.x, y: this.player.y + FEET };
  }

  /** Roads are cheaper so auto-walk prefers them. */
  private cost = (tx: number, ty: number) => {
    const t = this.roads.getTileAt(tx, ty);
    return t && t.index !== -1 ? 1 : 3;
  };

  private unlock(animate: boolean) {
    if (this.unlocked || !this.secretTiles.length) return;
    this.unlocked = true;
    this.lockLabel?.destroy();
    for (const [x, y] of this.secretTiles) this.collision.removeTileAt(x, y);
    this.secretLayer.setVisible(true);
    if (animate) {
      this.secretLayer.setAlpha(0);
      this.tweens.add({ targets: this.secretLayer, alpha: 1, duration: 900, ease: "Sine.out" });
      this.sfx("complete");
    }
  }

  private walkToChest() {
    if (!this.chest) return;
    const target = { x: Math.floor(this.chest.x / T) - 1, y: Math.floor(this.chest.y / T) };
    const f = this.feet();
    const start = this.tileOf(f.x, f.y);
    const path = findPath(this.isBlocked, this.cost, this.map.width, this.map.height, start.x, start.y, target.x, target.y);
    if (path) {
      this.path = path;
      this.pathTarget = "chest";
    }
  }

  private openChest() {
    if (!this.unlocked || !this.chest) return;
    this.chest.setFrame(1);
    this.sfx("open");
    bridge.emit("secret");
  }

  private setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.physics.world.pause();
    } else this.physics.world.resume();
  }

  private setSound(on: boolean) {
    this.soundOn = on;
    this.sound.mute = !on;
    if (on && !this.music) this.music = this.sound.add("music", { loop: true, volume: 0.35 });
    if (on && this.music && !this.music.isPlaying) this.music.play();
    if (!on) this.music?.pause();
  }

  private sfx(key: string, volume = 0.6) {
    if (this.soundOn) this.sound.play(key, { volume });
  }

  private floatText(text: string, color: string, shout?: string) {
    const t = this.add
      .text(this.player.x, this.player.y - 16, shout ? `${shout} ${text}` : text, {
        fontFamily: this.font,
        fontSize: "8px",
        color,
        stroke: "#000",
        strokeThickness: 3,
        resolution: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(10_000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 900, ease: "Cubic.out", onComplete: () => t.destroy() });
  }

  private say(text: string, ms = 2200) {
    this.bubble?.destroy();
    this.bubble = this.add
      .text(this.player.x, this.player.y - 14, text, {
        fontFamily: this.font,
        fontSize: "6px",
        color: "#000",
        backgroundColor: "#fff",
        padding: { x: 3, y: 2 },
        wordWrap: { width: 120 },
        align: "center",
        resolution: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(10_001);
    this.time.delayedCall(ms, () => this.bubble?.destroy());
  }

  private stamp(id: PlatformId, animate: boolean) {
    const door = this.doors.find((d) => d.platform === id);
    if (!door || this.stamps.has(id)) return;
    const b = door.building;
    const s = this.add
      .text(b.centerX, b.y - 2, "★ CLEARED", {
        fontFamily: this.font,
        fontSize: "6px",
        color: "#ffe14d",
        stroke: "#000",
        strokeThickness: 3,
        resolution: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(9_000);
    this.stamps.set(id, s);
    if (animate) {
      s.setScale(3).setAlpha(0);
      this.tweens.add({ targets: s, scale: 1, alpha: 1, duration: 400, ease: "Back.out" });
      this.sfx("clear");
      this.cameras.main.flash(150, 255, 240, 160);
    }
  }

  /** Where Pogi should head next: first uncleared building in channel order, then the hidden-beach chest. */
  private goal(): (GuideTarget & { door?: Door }) | null {
    const s = store.get();
    const next = bridge.meta.order.find((id) => !s.cleared.includes(id) && this.doors.some((d) => d.platform === id));
    if (next) {
      const d = this.doors.find((dd) => dd.platform === next)!;
      return {
        x: d.tx * T + 8,
        y: d.ty * T - 12,
        ground: { x: d.tx * T + 8, y: d.ty * T + 10 },
        icon: { key: `sign-${d.platform}` },
        door: d,
      };
    }
    if (this.unlocked && !s.secretSeen && this.chest)
      return {
        x: this.chest.x,
        y: this.chest.y - 8,
        ground: { x: this.chest.x, y: this.chest.y + 6 },
        icon: { key: "chest", frame: 0, scale: 1.5 },
      };
    return null;
  }

  /** Priority: what the player should do next. Creator flavor only once everything is done. */
  private idleLine(): string {
    const s = store.get();
    if (s.hearts <= 1) return "Konti na lang heart ko! Nood tayo ng video para gumaling.";
    const g = this.goal();
    if (g?.door) return `Tara sa ${bridge.meta.names[g.door.platform] ?? g.door.platform}! ${this.arrowTo(g.x, g.y)}`;
    if (g) return `May tulay na papuntang hidden beach! ${this.arrowTo(g.x, g.y)}`;
    return Phaser.Utils.Array.GetRandom(CREATOR_LINES);
  }

  private arrowTo(x: number, y: number) {
    const a = Phaser.Math.Angle.Between(this.player.x, this.player.y + FEET, x, y);
    const arrows = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
    return arrows[(Math.round(a / (Math.PI / 4)) + 8) % 8];
  }

  // ============================================================ actions

  private interact() {
    if (this.paused || !this.sys.isActive()) return;
    if (this.inChest) return this.openChest();
    if (this.currentDoor) this.enterRoom(this.currentDoor);
  }

  /** Deep link: stand at the door, go in and open the notice board. */
  private goto(id: PlatformId) {
    const door = this.doors.find((d) => d.platform === id);
    if (!door || !this.sys.isActive()) return;
    this.player.setPosition(door.tx * T + 8, door.ty * T + 8 - FEET);
    this.enterRoom(id, true);
  }

  private enterRoom(id: PlatformId, openBoard = false) {
    this.path = [];
    this.pathTarget = null;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.dir = "up";
    this.player.setFrame(DIR_COL.up);
    this.sfx("open");
    this.currentDoor = null;
    this.prompt = null;
    bridge.emit("prompt", null);
    store.set({ pos: { x: Math.round(this.player.x), y: Math.round(this.player.y) } });
    const data: RoomData = { platform: id, sfx: (k, v) => this.sfx(k, v), openBoard };
    this.scene.launch("room", data);
    this.scene.sleep();
  }

  /** Back outside: one tile below the door, facing out. */
  private exitRoom(id: PlatformId) {
    const door = this.doors.find((d) => d.platform === id);
    if (door) {
      const ty = this.isBlocked(door.tx, door.ty + 1) ? door.ty : door.ty + 1;
      this.player.setPosition(door.tx * T + 8, ty * T + 8 - FEET);
    }
    this.dir = "down";
    this.player.setFrame(DIR_COL.down);
    this.lastMove = this.time.now;
    this.fitZoom();
    this.cameras.main.fadeIn(220, 0, 0, 0);
    if (this.chestAfterWake) {
      this.chestAfterWake = false;
      this.walkToChest();
    }
  }

  private tapTo(sx: number, sy: number) {
    if (this.paused || !this.sys.isActive()) return;
    const wp = this.cameras.main.getWorldPoint(sx, sy);
    let target = this.tileOf(wp.x, wp.y);
    this.pathTarget = null;

    const door = this.doors.find(
      (d) => Phaser.Geom.Rectangle.Contains(d.building, wp.x, wp.y) || Phaser.Geom.Rectangle.Contains(d.zone, wp.x, wp.y),
    );
    if (this.chest && this.unlocked && Phaser.Math.Distance.Between(wp.x, wp.y, this.chest.x, this.chest.y) < 16) {
      return this.walkToChest();
    }
    if (door) {
      target = { x: door.tx, y: door.ty };
      this.pathTarget = door.platform;
    } else if (this.isBlocked(target.x, target.y)) {
      // nearest walkable tile around the tap
      let best: { x: number; y: number } | null = null;
      for (let r = 1; r <= 3 && !best; r++)
        for (let dy = -r; dy <= r && !best; dy++)
          for (let dx = -r; dx <= r && !best; dx++)
            if (!this.isBlocked(target.x + dx, target.y + dy)) best = { x: target.x + dx, y: target.y + dy };
      if (!best) return;
      target = best;
    }

    const f = this.feet();
    const start = this.tileOf(f.x, f.y);
    const path = findPath(this.isBlocked, this.cost, this.map.width, this.map.height, start.x, start.y, target.x, target.y);
    if (!path) return;
    this.path = path;
    if (!path.length && this.pathTarget) this.arrive();

    // tap marker
    const m = this.add.circle(target.x * T + 8, target.y * T + 8, 3, 0xffffff, 0.9).setDepth(1);
    this.tweens.add({ targets: m, scale: 2.5, alpha: 0, duration: 450, onComplete: () => m.destroy() });
  }

  private arrive() {
    const id = this.pathTarget;
    this.path = [];
    this.pathTarget = null;
    if (id === "chest") {
      this.dir = "right";
      this.player.setFrame(DIR_COL.right);
      this.openChest();
    } else if (id) this.enterRoom(id);
  }

  private collectCoin(c: Phaser.Physics.Arcade.Sprite) {
    const idx = c.getData("idx") as number;
    c.destroy();
    store.set((s) => ({ coins: s.coins + 1, collected: [...s.collected, idx] }));
    this.sfx("coin", 0.5);
    this.floatText("+1", "#ffe14d");
  }

  private hurt(from: Phaser.GameObjects.Sprite) {
    if (this.paused || this.time.now < this.invincibleUntil) return;
    // doors are safe zones
    const f = this.feet();
    if (this.doors.some((d) => Phaser.Geom.Rectangle.Contains(d.zone, f.x, f.y))) return;

    this.invincibleUntil = this.time.now + 900;
    const left = damage();
    this.sfx("hit");
    this.cameras.main.shake(120, 0.006);
    this.floatText("", "#ff5c5c", "Aray!");
    this.player.setTint(0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(90, () => this.player.clearTint());
    this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 4, duration: 80, onComplete: () => this.player.setAlpha(1) });

    // knockback only when steering manually (auto-walk never stops)
    if (!this.path.length) {
      const a = Phaser.Math.Angle.Between(from.x, from.y, this.player.x, this.player.y);
      this.player.setVelocity(Math.cos(a) * 160, Math.sin(a) * 160);
      this.knockUntil = this.time.now + 140;
    }

    if (left <= 0) {
      this.path = [];
      this.sfx("gameover");
      this.setPaused(true);
      this.player.setFrame(DIR_COL.down);
      bridge.emit("dead");
    }
  }

  private respawn() {
    store.set({ hearts: BASE_HEARTS, pos: null });
    this.player.setPosition(this.spawn.x, this.spawn.y - FEET);
    this.invincibleUntil = this.time.now + 1500;
    this.setPaused(false);
    this.say("Tara ulit!");
  }

  private revive() {
    if (store.get().hearts < BASE_HEARTS) store.set({ hearts: BASE_HEARTS });
    this.invincibleUntil = this.time.now + 1500;
    this.setPaused(false);
    this.puff();
    this.say("Buhay pa ako!");
  }

  private puff() {
    const s = this.add.sprite(this.player.x, this.player.y + FEET - 4, "smoke").setDepth(this.player.y + 1).setScale(0.6);
    s.play("smoke").once("animationcomplete", () => s.destroy());
  }

  // ============================================================ loop

  update(time: number, delta: number) {
    reportAnchor(this, this.player);
    const g = this.paused ? null : this.goal();
    // hide once Pogi is at the right door (the action hint takes over)
    this.arrow.update(g?.door && g.door.platform === this.currentDoor ? null : g, time);
    if (this.paused) return;
    this.updateEnemies(delta);
    if (time < this.knockUntil) return;

    // manual input (keyboard or joystick) cancels auto-walk
    const k = this.keys;
    let mx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let my = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (!mx && !my) {
      mx = bridge.input.x;
      my = bridge.input.y;
    }
    if (mx || my) {
      this.path = [];
      this.pathTarget = null;
    }

    let vx = 0;
    let vy = 0;
    if (this.path.length) {
      const next = this.path[0];
      const tx = next.x * T + 8;
      const ty = next.y * T + 8 - FEET; // align feet
      const dx = tx - this.player.x;
      const dy = ty - this.player.y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        this.player.setPosition(tx, ty);
        this.path.shift();
        if (!this.path.length) {
          this.player.setVelocity(0, 0);
          this.arrive();
          return;
        }
      } else if (Math.abs(dx) > Math.abs(dy)) vx = Math.sign(dx);
      else vy = Math.sign(dy);
    } else if (Math.abs(mx) > Math.abs(my)) vx = Math.sign(mx);
    else if (my) vy = Math.sign(my);

    // Corner assist (manual steering): slide around tile corners so gaps/bridges are easy to enter.
    let ax = 0;
    let ay = 0;
    if (!this.path.length && (vx || vy)) {
      const f = this.feet();
      const t = this.tileOf(f.x, f.y);
      if (vy) {
        const off = f.x - (t.x * T + 8);
        const side = Math.sign(off);
        if (side && this.isBlocked(t.x + side, t.y + vy) && !this.isBlocked(t.x, t.y + vy)) ax = -side;
        else if (this.isBlocked(t.x, t.y + vy) && Math.abs(off) > 3 && !this.isBlocked(t.x + side, t.y + vy) && !this.isBlocked(t.x + side, t.y)) ax = side;
        if (ax) ax *= Math.min(1, Math.abs(off) / 4);
      } else {
        const off = f.y - (t.y * T + 8);
        const side = Math.sign(off);
        if (side && this.isBlocked(t.x + vx, t.y + side) && !this.isBlocked(t.x + vx, t.y)) ay = -side;
        else if (this.isBlocked(t.x + vx, t.y) && Math.abs(off) > 3 && !this.isBlocked(t.x + vx, t.y + side) && !this.isBlocked(t.x, t.y + side)) ay = side;
        if (ay) ay *= Math.min(1, Math.abs(off) / 4);
      }
    }
    this.player.setVelocity((vx + ax * 0.8) * SPEED, (vy + ay * 0.8) * SPEED);
    if (vx || vy) {
      this.dir = vx > 0 ? "right" : vx < 0 ? "left" : vy > 0 ? "down" : "up";
      this.player.anims.play(`walk-${this.dir}`, true);
      this.lastMove = time;
      this.bubble?.destroy();
    } else {
      this.player.anims.stop();
      this.player.setFrame(DIR_COL[this.dir]);
      // the action hint owns the space above Pogi's head
      if (!this.prompt && time - this.lastMove > (this.spoke ? 7000 : 2500)) {
        this.lastMove = time;
        this.spoke = true;
        this.say(this.idleLine(), 3200);
      }
    }
    this.player.setDepth(this.player.y + FEET);
    this.bubble?.setPosition(this.player.x, this.player.y - 14);

    // door detection
    const f = this.feet();
    this.currentDoor = this.doors.find((d) => Phaser.Geom.Rectangle.Contains(d.zone, f.x, f.y))?.platform ?? null;
    // walk in: stepping up into a doorway enters (walking past it, or back out of it, does not)
    if (this.currentDoor && vy < 0 && !this.path.length) return this.enterRoom(this.currentDoor);
    this.inChest = !!(this.unlocked && this.chestZone && Phaser.Geom.Rectangle.Contains(this.chestZone, f.x, f.y));
    const prompt = this.inChest ? "OPEN CHEST" : null;
    if (prompt !== this.prompt) {
      this.prompt = prompt;
      if (prompt) this.bubble?.destroy();
      bridge.emit("prompt", prompt);
    }

    // autosave position
    this.saveTimer += delta;
    if (this.saveTimer > 2000) {
      this.saveTimer = 0;
      store.set({ pos: { x: Math.round(this.player.x), y: Math.round(this.player.y) } });
    }
  }

  private updateEnemies(delta: number) {
    const dt = delta / 1000;
    for (const e of this.enemies) {
      const s = e.sprite;
      e.t += dt;
      if (e.kind === "lamok") {
        // lazy zig-zag figure-eight inside its area
        const a = e.area;
        const x = a.centerX + Math.sin(e.t * 0.9) * (a.width / 2 - 6);
        const y = a.centerY + Math.sin(e.t * 1.8) * (a.height / 2 - 6);
        s.setVelocity((x - s.x) * 4, (y - s.y) * 4);
        s.setFlipX(Math.cos(e.t * 0.9) < 0);
      } else {
        // ipis: idle, then sudden dash
        if (e.t > e.next) {
          e.next = e.t + Phaser.Math.FloatBetween(1.2, 2.4);
          const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
          e.vx = Math.cos(ang) * 90;
          e.vy = Math.sin(ang) * 90;
          this.time.delayedCall(350, () => {
            e.vx = 0;
            e.vy = 0;
          });
        }
        s.setVelocity(e.vx, e.vy);
        if (e.vx || e.vy) s.setRotation(Math.atan2(e.vy, e.vx) + Math.PI / 2);
        // stay inside area
        if (!Phaser.Geom.Rectangle.Contains(e.area, s.x, s.y)) {
          e.vx = (e.area.centerX - s.x) * 2;
          e.vy = (e.area.centerY - s.y) * 2;
        }
        s.anims.timeScale = e.vx || e.vy ? 2 : 0.3;
      }
      s.setDepth(s.y + 4);
    }
  }
}
