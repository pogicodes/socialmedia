"use client";

import { useEffect, useRef } from "react";
import { bridge } from "@/game/bridge";

/** Bouncy "▶ ENTER …?" button that floats just above Pogi's head (tap = interact). */
export function ActionHint({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      const parent = el?.offsetParent as HTMLElement | null;
      if (el && parent) {
        // keep the whole button on screen
        const half = el.offsetWidth / 2 + 8;
        const x = Math.min(Math.max(bridge.anchor.x, half), parent.clientWidth - half);
        const y = Math.max(bridge.anchor.y, el.offsetHeight + 72);
        el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, calc(-100% - 10px))`;
        el.style.visibility = "visible";
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={ref} className="pointer-events-none invisible absolute top-0 left-0 z-[35]">
      <button
        type="button"
        onClick={() => bridge.emit("interact")}
        className="pixel-btn font-pixel pointer-events-auto animate-bounce bg-yellow-300 px-4 py-3 text-[11px] leading-relaxed whitespace-nowrap text-black"
      >
        ▶ {label}?
      </button>
    </div>
  );
}
