import type { PlatformId } from "@/lib/types";

/** Tiny typed event bus shared by Phaser (game) and React (overlays). */
type Events = {
  // Phaser → React
  progress: number;
  ready: void;
  door: PlatformId | null;
  enter: PlatformId;
  dead: void;
  chest: boolean;
  secret: void;
  // React → Phaser
  tap: { x: number; y: number };
  interact: void;
  pause: boolean;
  respawn: void;
  revive: void;
  newgame: void;
  sound: boolean;
  goto: PlatformId;
  complete: void;
  gotoSecret: void;
  // both
  healed: number;
  cleared: PlatformId;
};

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
  /** Level names + priority order (from Teable), set by React before the game boots. */
  meta: { names: {} as Partial<Record<PlatformId, string>>, order: [] as PlatformId[] },
};
