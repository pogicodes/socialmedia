"use client";

import { useSyncExternalStore } from "react";
import { store } from "@/game/state";
import type { Level } from "@/lib/types";

const useCleared = (id: Level["id"]) =>
  useSyncExternalStore(
    store.subscribe,
    () => store.get().cleared.includes(id),
    () => false,
  );

/** Tells the player what clears this building (any follow / open / 15s watch), then confirms it. */
export function Quest({ level }: { level: Level }) {
  const cleared = useCleared(level.id);
  if (cleared)
    return (
      <p className="pixel-box pop-in mb-3 bg-[#16a34a] px-3 py-2 text-sm text-white">
        <span className="font-pixel text-[10px] text-yellow-300">CLEARED! </span>
        +5 coins earned. Salamat, idol!
      </p>
    );
  return (
    <div className="pixel-box mb-3 bg-yellow-300 px-3 py-2 text-black">
      <p className="font-pixel text-[10px]">QUEST</p>
      <p className="mt-1 text-sm leading-snug">
        Tap <strong>{level.cta} ▶</strong> below to clear this world, or open / watch anything here for 15s.
        Reward: <strong>+5 coins</strong> and a ★ stamp.
      </p>
      <p aria-hidden className="bob mt-1 text-center text-lg leading-none">
        ↓
      </p>
    </div>
  );
}
