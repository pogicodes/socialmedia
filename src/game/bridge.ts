import type { PlatformId, RoomId } from "@/lib/types";

/** Tiny typed event bus shared by Phaser (game) and React (overlays). */
type Events = {
  // Phaser → React
  progress: number;
  ready: void;
  /** Action-hint label for whatever Pogi is standing at (door, chest, treasure), or null. */
  prompt: string | null;
  /** Entered (id) or left (null) a building's room. */
  room: RoomId | null;
  /** Opened something inside a room: index into meta.rooms[platform], or -1 for the notice board. */
  item: { platform: RoomId; index: number };
  dead: void;
  secret: void;
  // React → Phaser
  tap: { x: number; y: number };
  interact: void;
  pause: boolean;
  respawn: void;
  revive: void;
  newgame: void;
  sound: boolean;
  enterRoom: RoomId;
  complete: void;
  gotoSecret: void;
  // both
  healed: number;
  cleared: PlatformId;
};

/** Chest slots per room; extra videos/posts/repos stay on the notice board. */
export const MAX_TREASURES = 6;

type Handler<T> = (payload: T) => void;
const handlers = new Map<keyof Events, Set<Handler<unknown>>>();

export const bridge = {
  on<K extends keyof Events>(event: K, fn: Handler<Events[K]>) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(fn as Handler<unknown>);
    return () => handlers.get(event)?.delete(fn as Handler<unknown>);
  },
  emit<K extends keyof Events>(event: K, ...payload: Events[K] extends void ? [] : [Events[K]]) {
    handlers.get(event)?.forEach((fn) => fn(payload[0]));
  },
  /** Joystick vector written by React, read by Phaser every frame. */
  input: { x: 0, y: 0 },
  /** Top of Pogi's head in screen px, written by the active scene every frame (anchors the action hint). */
  anchor: { x: 0, y: 0 },
  /**
   * Set by React before the game boots: level names + priority order (from Teable),
   * colors, and each room's treasure titles (videos / posts / repos).
   */
  meta: {
    names: {} as Partial<Record<RoomId, string>>,
    order: [] as PlatformId[],
    colors: {} as Partial<Record<RoomId, string>>,
    rooms: {} as Partial<Record<RoomId, string[]>>,
  },
};
