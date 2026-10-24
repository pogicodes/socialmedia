"use client";

import { useSyncExternalStore } from "react";
import { store } from "@/game/state";
import type { Level } from "@/lib/types";
import { Sticker } from "./GameHud";

const none: Level["id"][] = [];

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
        Reward: <strong>+5 coins</strong> and a badge.
      </p>
      <p aria-hidden className="bob mt-1 text-center text-lg leading-none">
        ↓
      </p>
    </div>
  );
}

/** Badge list: what each one is and how to get it. Lives in the Badges modal. */
export function Badges({ levels }: { levels: Level[] }) {
  const cleared = useSyncExternalStore(store.subscribe, () => store.get().cleared, () => none);
  return (
    <>
      <p className="mb-3 text-sm text-zinc-700">
        One badge per world — {cleared.length}/{levels.length} collected. Get one by walking into that building and
        tapping its follow button (or watching something inside for 15s).
      </p>
      <ul className="space-y-2">
        {levels.map((l) => {
          const done = cleared.includes(l.id);
          return (
            <li key={l.id} className="pixel-box flex items-center gap-3 bg-white p-2">
              <Sticker level={l} done={done} big />
              <div className="min-w-0 flex-1">
                <p className="font-pixel text-[10px] leading-snug text-black">{l.levelName.split(/:\s*/).pop()}</p>
                <p className="text-sm text-zinc-600">
                  {done ? "Collected! Salamat, idol!" : `Go inside and tap ${l.cta} ▶`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
