import type { PlatformId } from "@/lib/types";
import { bridge } from "./bridge";

export const BASE_HEARTS = 3;
export const MAX_HEARTS = 4; // 4th = golden bonus heart (Facebook)

export interface GameState {
  hearts: number;
  coins: number;
  cleared: PlatformId[];
  /** indices of collected map coins */
  collected: number[];
  pos: { x: number; y: number } | null;
  introSeen: boolean;
  completeSeen: boolean;
}

const SAVE_KEY = "pogi:save:v1";
const HEALED_KEY = "pogi:healed";

const fresh = (): GameState => ({
  hearts: BASE_HEARTS,
  coins: 0,
  cleared: [],
  collected: [],
  pos: null,
  introSeen: false,
  completeSeen: false,
});

let state: GameState = fresh();
const listeners = new Set<() => void>();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) state = { ...fresh(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}
if (typeof window !== "undefined") load();

function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export const store = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  set(patch: Partial<GameState> | ((s: GameState) => Partial<GameState>)) {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    persist();
    listeners.forEach((fn) => fn());
  },
  reset() {
    state = { ...fresh(), introSeen: true };
    persist();
    listeners.forEach((fn) => fn());
  },
};

// ------------------------------------------------------------- hearts

export function damage() {
  store.set((s) => ({ hearts: Math.max(0, s.hearts - 1) }));
  return state.hearts;
}

export type Engagement = "watch" | "click";

/** Heal table (see docs/PLAN.md). Returns hearts gained (0 if already healed this session). */
export function engage(kind: Engagement, platform: PlatformId, contentId: string): number {
  const key = `${kind}:${platform}:${contentId}`;
  let healed: string[] = [];
  try {
    healed = JSON.parse(sessionStorage.getItem(HEALED_KEY) ?? "[]");
  } catch {
    /* ignore */
  }

  clear(platform);
  if (healed.includes(key)) return 0;
  healed.push(key);
  try {
    sessionStorage.setItem(HEALED_KEY, JSON.stringify(healed));
  } catch {
    /* ignore */
  }

  const before = state.hearts;
  let after = before;
  if (kind === "watch" && platform === "facebook") after = MAX_HEARTS;
  else if (kind === "watch" && platform === "youtube") after = Math.max(before, BASE_HEARTS);
  else if (kind === "watch" && platform === "tiktok") after = Math.max(before, Math.min(BASE_HEARTS, before + 2));
  else after = Math.max(before, Math.min(BASE_HEARTS, before + 1));

  if (after !== before) {
    store.set({ hearts: after });
    bridge.emit("healed", after - before);
  }
  return after - before;
}

/** First engagement with a platform clears its building: +5 coins and a stamp. */
export function clear(platform: PlatformId) {
  if (state.cleared.includes(platform)) return;
  store.set((s) => ({ cleared: [...s.cleared, platform], coins: s.coins + 5 }));
  bridge.emit("cleared", platform);
}
