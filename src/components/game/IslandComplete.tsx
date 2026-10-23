"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";
import { site } from "@/site.config";

const COLORS = ["#ffe14d", "#1877F2", "#FF0033", "#25F4EE", "#E1306C", "#8B5CF6", "#58b04f"];

export function shareText(coins: number) {
  return `I cleared Pogi Island 🏝️ with ${coins} coins! Kaya mo ba? 😎`;
}

/** Native share sheet when available; otherwise Facebook / X / copy link. */
export function ShareButtons({ coins, source }: { coins: number; source: string }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(coins);
  const url = site.url;
  const canNative = typeof navigator !== "undefined" && !!navigator.share;

  if (canNative)
    return (
      <button
        type="button"
        className="pixel-btn font-pixel w-full bg-[#1877F2] py-3 text-[10px] text-white"
        onClick={() => {
          track("share", { via: "native", source });
          navigator.share({ title: "Pogi Island", text, url }).catch(() => {});
        }}
      >
        📣 SHARE MY SCORE
      </button>
    );

  return (
    <div className="grid gap-2">
      <a
        className="pixel-btn font-pixel block bg-[#1877F2] py-3 text-center text-[10px] text-white"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("share", { via: "facebook", source })}
      >
        SHARE ON FACEBOOK
      </a>
      <a
        className="pixel-btn font-pixel block bg-black py-3 text-center text-[10px] text-white"
        href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("share", { via: "x", source })}
      >
        POST ON X
      </a>
      <button
        type="button"
        className="pixel-btn font-pixel bg-white py-3 text-[10px]"
        onClick={() => {
          navigator.clipboard?.writeText(`${text} ${url}`);
          setCopied(true);
          track("share", { via: "copy", source });
        }}
      >
        {copied ? "COPIED! ✓" : "COPY LINK"}
      </button>
    </div>
  );
}

export function IslandComplete({
  coins,
  total,
  onHiddenBeach,
  onClose,
}: {
  coins: number;
  total: number;
  onHiddenBeach: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="complete-title">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 48 }, (_, i) => (
          <span
            key={i}
            className="confetti absolute top-[-5%] block size-2"
            style={{
              left: `${(i * 37) % 100}%`,
              backgroundColor: COLORS[i % COLORS.length],
              animationDelay: `${(i % 12) * 0.15}s`,
              animationDuration: `${2.4 + (i % 5) * 0.4}s`,
            }}
          />
        ))}
      </div>
      <div className="pop-in pixel-box relative w-full max-w-sm bg-[#1b1b2f] p-5 text-center text-white">
        <h2 id="complete-title" className="font-pixel text-lg leading-snug text-yellow-300">
          ISLAND
          <br />
          COMPLETE!
        </h2>
        <div
          aria-hidden
          className="mx-auto mt-4 h-[72px] w-12 [image-rendering:pixelated]"
          style={{ backgroundImage: "url(/game/sprites/pogi.png)", backgroundSize: "192px 288px", backgroundPosition: "0 0" }}
        />
        <p className="font-pixel mt-3 text-[11px]">&ldquo;Salamat, idol!&rdquo;</p>
        <p className="mt-2 text-sm text-zinc-300">
          All {total} worlds cleared with <strong className="text-yellow-300">{coins} coins</strong>. A bridge just appeared to the east…
        </p>
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={onHiddenBeach} className="pixel-btn font-pixel bg-yellow-300 py-3 text-[10px] text-black">
            🏝️ GO TO THE HIDDEN BEACH
          </button>
          <ShareButtons coins={coins} source="complete" />
          <button type="button" onClick={onClose} className="font-pixel mt-1 text-[9px] text-zinc-400 underline">
            Keep exploring
          </button>
        </div>
      </div>
    </div>
  );
}
