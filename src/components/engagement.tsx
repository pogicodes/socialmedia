"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { PlatformId } from "@/lib/types";

export interface EngagementApi {
  /** Watched an embed for ≥15s (visible). */
  watched: (platform: PlatformId, contentId: string) => void;
  /** Opened an outbound link (post, repo, follow/subscribe). */
  clicked: (platform: PlatformId, url: string) => void;
}

const noop: EngagementApi = { watched: () => {}, clicked: () => {} };
const Ctx = createContext<EngagementApi>(noop);

export const EngagementProvider = Ctx.Provider;
export const useEngagement = () => useContext(Ctx);

export const WATCH_SECONDS = 15;

/**
 * Counts seconds while `active` and the tab is visible; calls onDone once at WATCH_SECONDS.
 * Embeds from Facebook/TikTok don't expose reliable progress without heavy SDKs, so
 * "watched" = the player was open and visible for 15s.
 */
export function useWatchTimer(active: boolean, onDone: () => void) {
  const done = useRef(false);
  const cb = useRef(onDone);
  useEffect(() => {
    cb.current = onDone;
  });
  useEffect(() => {
    if (!active || done.current) return;
    let secs = 0;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      secs += 1;
      if (secs >= WATCH_SECONDS && !done.current) {
        done.current = true;
        clearInterval(id);
        cb.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [active]);
}
