"use client";

import { useEffect, useState } from "react";
import { VerticalEmbed, embedFor } from "../LevelCards";
import type { HubData } from "@/lib/types";

/** Seconds before "skip" unlocks — like a video ad. */
const SKIP_AFTER = 5;

/** Arcade "CONTINUE?" — watching 15s revives in place; skip (after a countdown) respawns at the jeepney. */
export function ContinueScreen({
  data,
  onGiveUp,
}: {
  data: HubData;
  onGiveUp: () => void;
}) {
  const [skipIn, setSkipIn] = useState(SKIP_AFTER);
  const [watching, setWatching] = useState(false);

  const fb = data.levels.find((l) => l.id === "facebook");
  const reel = (data.posts.facebook ?? []).find((p) => embedFor({ id: "facebook" }, p.url));
  const yt = data.videos[0];

  useEffect(() => {
    if (skipIn <= 0) return;
    const t = setTimeout(() => setSkipIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [skipIn]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="continue-title">
      <div className="pixel-box w-full max-w-sm bg-[#1b1b2f] p-4 text-center text-white">
        <p className="font-pixel text-[10px] text-zinc-400">POGI FAINTED 💫</p>
        <h2 id="continue-title" className="font-pixel mt-2 text-xl text-yellow-300">
          CONTINUE?
        </h2>
        <p className="mt-2 text-sm text-zinc-200">
          {watching ? "Keep watching… you'll revive at 15s." : "Tara, nood tayo! Watch 15s to revive with full hearts."}
        </p>

        <div className="mt-3">
          {fb && reel ? (
            <VerticalEmbed
              level={{ id: "facebook", color: fb.color }}
              src={embedFor({ id: "facebook" }, reel.url)!}
              title="Watch to revive"
              onPlay={() => setWatching(true)}
            />
          ) : yt ? (
            <VerticalEmbed
              level={{ id: "youtube", color: "#FF0033" }}
              src={`https://www.youtube-nocookie.com/embed/${yt.id}?autoplay=1&rel=0`}
              title="Watch to revive"
              onPlay={() => setWatching(true)}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={onGiveUp}
          disabled={skipIn > 0}
          aria-live="polite"
          className="pixel-btn font-pixel mt-4 w-full bg-white py-3 text-[10px] text-black disabled:cursor-not-allowed disabled:bg-zinc-500 disabled:text-zinc-200"
        >
          {skipIn > 0 ? `SKIP IN ${skipIn}…` : "SKIP ▶▶ BACK TO THE JEEPNEY"}
        </button>
      </div>
    </div>
  );
}
