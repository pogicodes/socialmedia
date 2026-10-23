"use client";

import { track } from "@vercel/analytics";
import { useEffect } from "react";
import { Icon } from "../Icon";
import { useEngagement } from "../engagement";
import { textOn } from "@/lib/color";
import type { Level } from "@/lib/types";

/** Simple modal shell used by Follow all / Menu / Credits. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" tabIndex={-1} className="fade-in absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="sheet-in pixel-box relative max-h-[85dvh] w-full max-w-md overflow-y-auto bg-[#fffaf0] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-pixel text-xs text-black">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="pixel-btn font-pixel grid size-9 place-items-center bg-white text-xs">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FollowAll({ levels, onClose }: { levels: Level[]; onClose: () => void }) {
  const eng = useEngagement();
  return (
    <Modal title="FOLLOW ALL" onClose={onClose}>
      <p className="mb-3 text-sm text-zinc-700">One tap each — salamat, idol!</p>
      <ul className="space-y-2">
        {levels.map((l) => (
          <li key={l.id}>
            <a
              href={l.id === "youtube" ? `${l.url}?sub_confirmation=1` : l.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track("outbound", { platform: l.id, source: "follow_all" });
                eng.clicked(l.id, l.url);
              }}
              className="pixel-btn font-pixel flex items-center gap-3 px-3 py-3 text-[11px]"
              style={{ backgroundColor: l.color, color: textOn(l.color) }}
            >
              <Icon path={l.iconPath} className="size-5" />
              <span className="flex-1">{l.platform}</span>
              <span>{l.cta} ▶</span>
            </a>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
