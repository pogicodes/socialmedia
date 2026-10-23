"use client";

import { useEffect, useState } from "react";
import { VerticalEmbed, embedFor } from "../LevelCards";
import type { HubData } from "@/lib/types";

const SECONDS = 10;

/** Arcade "CONTINUE?" — watching content revives in place; timeout/give up respawns at the jeepney. */
export function ContinueScreen({
  data,
  onGiveUp,
}: {
  data: HubData;
  onGiveUp: () => void;
}) {
  const [left, setLeft] = useState(SECONDS);
  const [watching, setWatching] = useState(false);

  const fb = data.levels.find((l) => l.id === "facebook");
  const reel = (data.posts.facebook ?? []).find((p) => embedFor({ id: "facebook" }, p.url));
  const yt = data.videos[0];

  useEffect(() => {
    if (watching) return;
    if (left <= 0) {
      onGiveUp();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, watching, onGiveUp]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="continue-title">
      <div className="pixel-box w-full max-w-sm bg-[#1b1b2f] p-4 text-center text-white">
        <p className="font-pixel text-[10px] text-zinc-400">POGI FAINTED 💫</p>
        <h2 id="continue-title" className="font-pixel mt-2 text-xl text-yellow-300">
          CONTINUE? {watching ? "" : left}
        </h2>
        <p className="mt-2 text-sm text-zinc-200">Tara, nood tayo! Watch 15s to revive with full hearts.</p>

        <div className="mt-3">
          {fb && reel ? (
            <VerticalEmbed
              level={{ id: "facebook", color: fb.color }}
              src={embedFor({ id: "facebook" }, reel.url)!}
              title="Watch to revive"
              onPlay={() => setWatching(true)}
            />
          ) : yt ? (
            <YouTubeRevive id={yt.id} title={yt.title} onPlay={() => setWatching(true)} />
          ) : null}
        </div>

        <button type="button" onClick={onGiveUp} className="font-pixel mt-4 text-[10px] text-zinc-400 underline">
          Give up (back to the jeepney)
        </button>
      </div>
    </div>
  );
}

function YouTubeRevive({ id, title, onPlay }: { id: string; title: string; onPlay: () => void }) {
  const [playing, setPlaying] = useState(false);
  return (
    <VerticalEmbed
      level={{ id: "youtube", color: "#FF0033" }}
      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
      title={playing ? title : "Watch to revive"}
      onPlay={() => {
        setPlaying(true);
        onPlay();
      }}
    />
  );
}
