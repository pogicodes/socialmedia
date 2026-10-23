"use client";

import { useEffect, useRef, useState } from "react";
import { bridge } from "@/game/bridge";

const DEAD = 12;
const MAX = 44;

/**
 * Full-screen touch/mouse layer: drag = floating joystick (4-dir snap),
 * quick tap = walk there. Keyboard is handled inside Phaser.
 */
export function Joystick({ onFirstMove }: { onFirstMove?: () => void }) {
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => () => {
    bridge.input.x = 0;
    bridge.input.y = 0;
  }, []);

  const end = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    if (!stick && performance.now() - s.t < 400) bridge.emit("tap", { x: e.clientX, y: e.clientY });
    start.current = null;
    setStick(null);
    bridge.input.x = 0;
    bridge.input.y = 0;
  };

  return (
    <div
      className="absolute inset-0 z-[25] touch-none select-none"
      onPointerDown={(e) => {
        if (start.current) return;
        start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        let dx = e.clientX - s.x;
        let dy = e.clientY - s.y;
        const dist = Math.hypot(dx, dy);
        if (!stick && dist < DEAD) return;
        if (dist > MAX) {
          dx = (dx / dist) * MAX;
          dy = (dy / dist) * MAX;
        }
        setStick({ x: s.x, y: s.y, dx, dy });
        const horiz = Math.abs(dx) > Math.abs(dy);
        bridge.input.x = horiz ? Math.sign(dx) : 0;
        bridge.input.y = horiz ? 0 : Math.sign(dy);
        if (!moved.current) {
          moved.current = true;
          onFirstMove?.();
        }
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {stick && (
        <div
          className="pointer-events-none absolute size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-black/60 bg-white/25"
          style={{ left: stick.x, top: stick.y }}
        >
          <div
            className="absolute top-1/2 left-1/2 size-10 rounded-full border-4 border-black bg-white/90 shadow-[0_3px_0_#000]"
            style={{ transform: `translate(calc(-50% + ${stick.dx}px), calc(-50% + ${stick.dy}px))` }}
          />
        </div>
      )}
    </div>
  );
}
