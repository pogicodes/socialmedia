"use client";

import { track } from "@vercel/analytics";
import { Icon } from "./Icon";
import type { Level } from "@/lib/types";
import { navExclude } from "@/site.config";

export function Hud({
  levels,
  soundOn,
  onToggleSound,
}: {
  levels: Level[];
  soundOn?: boolean;
  onToggleSound?: () => void;
}) {
  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-black bg-[#1b1b2f] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-1">
        {levels.filter((l) => !navExclude.includes(l.id)).map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${l.platform} ${l.handle}`}
            onClick={() => track("outbound", { platform: l.id, source: "hud" })}
            className="pixel-btn grid size-11 place-items-center text-white"
            style={{ backgroundColor: l.color }}
          >
            <Icon path={l.iconPath} className="size-5 drop-shadow-[1px_1px_0_#000]" />
          </a>
        ))}
        {onToggleSound && (
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute sound effects" : "Enable sound effects"}
          className="pixel-btn grid size-11 place-items-center bg-white text-lg"
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
        )}
      </div>
    </nav>
  );
}
