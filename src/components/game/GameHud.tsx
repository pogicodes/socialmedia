"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { MAX_HEARTS, store, BASE_HEARTS } from "@/game/state";
import type { Level } from "@/lib/types";

const useGame = () => useSyncExternalStore(store.subscribe, store.get, store.get);

function Heart({ state }: { state: "full" | "empty" | "gold" }) {
  return (
    <span
      aria-hidden
      className="inline-block size-5 bg-no-repeat [image-rendering:pixelated]"
      style={{
        backgroundImage: "url(/game/sprites/heart.png)",
        backgroundSize: "100px 20px",
        backgroundPosition: state === "empty" ? "0 0" : "-80px 0",
        filter: state === "gold" ? "sepia(1) saturate(6) hue-rotate(2deg) brightness(1.15)" : undefined,
      }}
    />
  );
}

/** One sticker per world: grey until cleared, then the platform's color (pops in live). */
function Stickers({ levels, cleared }: { levels: Level[]; cleared: Level["id"][] }) {
  return (
    <ul className="flex gap-1" aria-label={`${cleared.length} of ${levels.length} worlds cleared`}>
      {levels.map((l) => {
        const done = cleared.includes(l.id);
        return (
          <li
            key={`${l.id}-${done}`}
            aria-label={`${l.platform} ${done ? "cleared" : "not cleared"}`}
            className={`grid size-6 place-items-center border-2 border-black ${done ? "pop-in text-white shadow-[2px_2px_0_#000]" : "bg-[#1b1b2f]/70 text-white/30"}`}
            style={done ? { backgroundColor: l.color } : undefined}
          >
            <Icon path={l.iconPath} className={`size-3.5 ${done ? "drop-shadow-[1px_1px_0_#000]" : ""}`} />
          </li>
        );
      })}
    </ul>
  );
}

export function GameHud({
  levels,
  soundOn,
  onSound,
  onFollowAll,
  onMenu,
}: {
  levels: Level[];
  soundOn: boolean;
  onSound: () => void;
  onFollowAll: () => void;
  onMenu: () => void;
}) {
  const s = useGame();
  // shake the hearts (not the screen) when one is lost
  const [hit, setHit] = useState(0);
  const prevHearts = useRef(s.hearts);
  useEffect(() => {
    if (s.hearts < prevHearts.current) setHit((n) => n + 1);
    prevHearts.current = s.hearts;
  }, [s.hearts]);
  const hearts = Array.from({ length: Math.max(BASE_HEARTS, s.hearts) }, (_, i) =>
    i >= BASE_HEARTS ? "gold" : i < s.hearts ? "full" : "empty",
  ) as ("full" | "empty" | "gold")[];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex flex-col gap-1.5">
        <div className="pixel-box pointer-events-auto flex items-center gap-1.5 bg-[#1b1b2f]/90 px-1.5 py-1.5 text-white">
          <span
            key={hit}
            className={`flex items-center ${hit ? "hurt-shake" : ""}`}
            aria-label={`${s.hearts} of ${MAX_HEARTS} hearts`}
          >
            {hearts.map((h, i) => (
              <Heart key={i} state={h} />
            ))}
          </span>
          <span className="font-pixel flex items-center gap-1 text-[10px]" aria-label={`${s.coins} coins`}>
            <span
              aria-hidden
              className="inline-block size-4 [image-rendering:pixelated]"
              style={{ backgroundImage: "url(/game/sprites/coin.png)", backgroundSize: "64px 16px" }}
            />
            {s.coins}
          </span>
          <span className="font-pixel text-[10px] text-yellow-300" aria-label={`${s.cleared.length} of ${levels.length} cleared`}>
            {s.cleared.length}/{levels.length}
          </span>
        </div>
        <Stickers levels={levels} cleared={s.cleared} />
      </div>
      <div className="pointer-events-auto flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onFollowAll}
          className="pixel-btn font-pixel h-10 bg-[#1877F2] px-1.5 text-[8px] leading-tight text-white"
        >
          FOLLOW
          <br />
          ALL
        </button>
        <button
          type="button"
          onClick={onSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute" : "Sound on"}
          className="pixel-btn grid size-10 place-items-center bg-white text-base"
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
        <button
          type="button"
          onClick={onMenu}
          aria-label="Menu"
          className="pixel-btn font-pixel grid size-10 place-items-center bg-white text-sm"
        >
          ☰
        </button>
      </div>
    </div>
  );
}
