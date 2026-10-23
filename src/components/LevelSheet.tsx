"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import type { Level } from "@/lib/types";

/** Bottom sheet on mobile, centered modal on desktop. Esc / backdrop / ✕ / swipe-down closes. */
export function LevelSheet({
  level,
  onClose,
  children,
}: {
  level: Level;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center md:pb-20">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="fade-in absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-title"
        className="sheet-in pixel-box relative flex max-h-[88dvh] w-full max-w-xl flex-col bg-[#fffaf0] md:max-h-[calc(100dvh-8rem)]"
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
      >
        <div
          className="flex cursor-grab touch-none flex-col items-center pt-2 md:hidden"
          onPointerDown={(e) => {
            startY.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (startY.current !== null) setDragY(Math.max(0, e.clientY - startY.current));
          }}
          onPointerUp={() => {
            if (dragY > 90) onClose();
            startY.current = null;
            setDragY(0);
          }}
        >
          <span className="h-1.5 w-12 rounded-full bg-zinc-400" />
        </div>

        <header className="flex items-center gap-3 border-b-4 border-black px-4 py-3">
          <span
            className="pixel-btn grid size-10 shrink-0 place-items-center text-white"
            style={{ backgroundColor: level.color }}
          >
            <Icon path={level.iconPath} className="size-5 drop-shadow-[1px_1px_0_#000]" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="level-title" className="font-pixel text-[11px] leading-snug text-black">
              {level.levelName}
            </h2>
            <p className="truncate text-sm text-zinc-600">
              {level.platform} · {level.handle}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close level"
            className="pixel-btn font-pixel grid size-10 shrink-0 place-items-center bg-white text-xs"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="mb-3 text-[15px] text-zinc-800">{level.pitch}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
