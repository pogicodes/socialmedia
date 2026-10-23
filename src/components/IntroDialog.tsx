"use client";

import { useEffect, useState } from "react";

/**
 * Non-blocking intro: types lines in a pixel dialogue box, then calls onDone
 * (parent collapses it into a speech bubble). Tap to fast-forward.
 */
export function IntroDialog({
  lines,
  instant,
  onDone,
}: {
  lines: readonly string[];
  instant: boolean;
  onDone: () => void;
}) {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(instant ? Infinity : 0);
  const text = lines[line] ?? "";
  const typed = text.slice(0, chars);
  const lineDone = chars >= text.length;

  useEffect(() => {
    if (!lineDone) {
      const t = setTimeout(() => setChars((c) => c + 1), 35);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => {
        if (line < lines.length - 1) {
          setLine((l) => l + 1);
          setChars(instant ? Infinity : 0);
        } else onDone();
      },
      instant ? 1800 : 1100,
    );
    return () => clearTimeout(t);
  }, [chars, lineDone, line, lines.length, instant, onDone]);

  const advance = () => {
    if (!lineDone) setChars(Infinity);
    else if (line < lines.length - 1) {
      setLine((l) => l + 1);
      setChars(Infinity);
    } else onDone();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[36] px-3">
      <button
        type="button"
        onClick={advance}
        className="pixel-box pointer-events-auto mx-auto block w-full max-w-md bg-white px-3 py-2.5 text-left"
        aria-live="polite"
      >
        <span className="font-pixel block min-h-[1.6em] text-[10px] leading-relaxed text-black sm:text-xs">
          {typed}
          {lineDone && <span className="blink ml-1">▼</span>}
        </span>
        <span className="font-pixel mt-1 block text-right text-[7px] text-zinc-500">
          TAP TO SKIP ▶▶
        </span>
      </button>
    </div>
  );
}
