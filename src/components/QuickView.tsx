"use client";

import Image from "next/image";
import { useEffect } from "react";
import { GameShell } from "./game/GameShell";
import { Icon } from "./Icon";
import { LevelCard } from "./LevelCards";
import type { HubData } from "@/lib/types";
import { site } from "@/site.config";

/**
 * Server-rendered, accessible hub. Base page for everyone (and crawlers);
 * the island game will enhance on top of it.
 */
export function QuickView({ data }: { data: HubData }) {
  const { levels } = data;

  // ?level=facebook → scroll to and highlight that channel.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("level");
    const el = id && document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.classList.add("highlight");
  }, []);

  return (
    <div className="world min-h-dvh pb-24">
      <header className="relative z-10 flex flex-col items-center px-4 pt-6 pb-4 text-center">
        <div className="pixel-box grid size-16 place-items-center bg-white">
          <Image src="/logo.png" alt="PogiCodes logo" width={56} height={56} priority />
        </div>
        <h1 className="font-pixel mt-3 text-xl text-white drop-shadow-[3px_3px_0_#000] sm:text-2xl">
          {site.brand}
        </h1>
        <p className="mt-1 text-sm font-medium text-white/90 drop-shadow-[1px_1px_0_#000]">
          {site.byline}
        </p>
        <p className="font-pixel pixel-box mt-4 bg-white px-3 py-2 text-[9px] leading-relaxed text-black">
          {site.tagline}
        </p>
      </header>

      <main className="relative z-10 mx-auto flex max-w-xl flex-col gap-6 px-3">
        {levels.map((level, i) => (
          <section
            key={level.id}
            id={level.id}
            aria-labelledby={`${level.id}-title`}
            className="pixel-box scroll-mt-4 bg-[#fffaf0]"
          >
            <header
              className="flex items-center gap-3 border-b-4 border-black px-4 py-3"
              style={i === 0 ? { backgroundColor: "#fff3c4" } : undefined}
            >
              <span
                className="pixel-btn grid size-10 shrink-0 place-items-center text-white"
                style={{ backgroundColor: level.color }}
              >
                <Icon path={level.iconPath} className="size-5 drop-shadow-[1px_1px_0_#000]" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={`${level.id}-title`} className="font-pixel text-[11px] leading-snug text-black">
                  {level.levelName}
                </h2>
                <p className="truncate text-sm text-zinc-600">
                  {level.platform} · {level.handle}
                </p>
              </div>
              {i === 0 && (
                <span className="font-pixel shrink-0 rotate-6 bg-yellow-300 px-1.5 py-1 text-[8px] text-black shadow-[2px_2px_0_#000]">
                  MAIN!
                </span>
              )}
            </header>
            <div className="px-4 pt-3 pb-4">
              <p className="mb-3 text-[15px] text-zinc-800">{level.pitch}</p>
              <LevelCard level={level} data={data} />
            </div>
          </section>
        ))}
      </main>

      <GameShell data={data} />
    </div>
  );
}
