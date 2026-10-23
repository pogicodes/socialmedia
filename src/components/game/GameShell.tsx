"use client";

import { track } from "@vercel/analytics";
import { useCallback, useEffect, useRef, useState } from "react";
import { EngagementProvider, type EngagementApi } from "../engagement";
import { IntroDialog } from "../IntroDialog";
import { LevelCard } from "../LevelCards";
import { LevelSheet } from "../LevelSheet";
import { ContinueScreen } from "./ContinueScreen";
import { IslandComplete, ShareButtons } from "./IslandComplete";
import { GameHud } from "./GameHud";
import { Joystick } from "./Joystick";
import { FollowAll, Modal } from "./Modals";
import { bridge } from "@/game/bridge";
import { engage, store } from "@/game/state";
import type { HubData, PlatformId } from "@/lib/types";
import { site } from "@/site.config";

type Mode = "quick" | "game";
const MODE_KEY = "pogi:mode";
const SFX_KEY = "pogi:sfx";

function initialMode(): { mode: Mode; reason: "saved" | "reduced" | "slow" | "default" } {
  const saved = localStorage.getItem(MODE_KEY) as Mode | null;
  if (saved === "quick" || saved === "game") return { mode: saved, reason: "saved" };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return { mode: "quick", reason: "reduced" };
  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 4) <= 2 || (nav.deviceMemory ?? 4) <= 1) return { mode: "quick", reason: "slow" };
  return { mode: "game", reason: "default" };
}

const shortName = (levelName: string) => levelName.split(/:\s*/).pop() ?? levelName;

/**
 * Enhances the server-rendered quick view with the playable island.
 * Falls back to quick view on reduced motion, slow devices, or load failure.
 */
export function GameShell({ data }: { data: HubData }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [reason, setReason] = useState<string>("default");

  useEffect(() => {
    const m = initialMode();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only detection after hydration
    setMode(m.mode);
    setReason(m.reason);
  }, []);

  const choose = (m: Mode) => {
    localStorage.setItem(MODE_KEY, m);
    setMode(m);
    track("mode", { mode: m });
  };

  if (mode === "game") return <Game data={data} onQuickView={() => choose("quick")} onFail={() => setMode("quick")} />;
  if (mode === "quick")
    return (
      <div className="fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-2">
        {reason === "reduced" && (
          <p className="pixel-box max-w-[14rem] bg-white px-2 py-1 text-xs text-zinc-700">Reduced motion is on, so we opened quick view.</p>
        )}
        <button type="button" onClick={() => choose("game")} className="pixel-btn font-pixel bg-yellow-300 px-3 py-3 text-[10px] text-black">
          🎮 PLAY POGI ISLAND
        </button>
      </div>
    );
  return null;
}

function Game({ data, onQuickView, onFail }: { data: HubData; onQuickView: () => void; onFail: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [door, setDoor] = useState<PlatformId | null>(null);
  const [open, setOpen] = useState<PlatformId | null>(null);
  const [dead, setDead] = useState(false);
  const [modal, setModal] = useState<"follow" | "menu" | "credits" | "secret" | "share" | null>(null);
  const [chest, setChest] = useState(false);
  const [complete, setComplete] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [intro, setIntro] = useState(false);
  const [hint, setHint] = useState(false);
  const deadRef = useRef(false);

  const { levels } = data;
  const level = open ? levels.find((l) => l.id === open) : null;

  // boot Phaser (client-only, lazy)
  useEffect(() => {
    let game: { destroy: (b: boolean) => void } | null = null;
    let cancelled = false;
    const offs = [
      bridge.on("progress", (v) => setProgress(v)),
      bridge.on("ready", () => setReady(true)),
      bridge.on("door", (d) => setDoor(d)),
      bridge.on("chest", (c) => setChest(c)),
      bridge.on("secret", () => {
        store.set({ secretSeen: true });
        setModal("secret");
        bridge.emit("pause", true);
        track("secret_open");
      }),
      bridge.on("enter", (id) => {
        setOpen(id);
        bridge.emit("pause", true);
        const url = new URL(location.href);
        url.searchParams.set("level", id);
        history.replaceState(null, "", url);
        track("level_open", { level: id, source: "game" });
      }),
      bridge.on("dead", () => {
        deadRef.current = true;
        setDead(true);
        track("game_over");
      }),
    ];
    bridge.meta.names = Object.fromEntries(levels.map((l) => [l.id, shortName(l.levelName)]));
    bridge.meta.order = levels.map((l) => l.id);
    if (new URLSearchParams(location.search).has("debug"))
      (window as unknown as { __pogi: unknown }).__pogi = { bridge, store };
    import("@/game/createGame")
      .then(({ createGame }) => {
        if (cancelled || !host.current) return;
        game = createGame(host.current);
        const dbg = (window as unknown as { __pogi?: Record<string, unknown> }).__pogi;
        if (dbg) dbg.game = game;
        track("game_start");
      })
      .catch(() => onFail());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      offs.forEach((o) => o());
      game?.destroy(true);
      document.body.style.overflow = prev;
    };
  }, [onFail, levels]);

  // after ready: sound pref, deep link, intro
  useEffect(() => {
    if (!ready) return;
    const on = localStorage.getItem(SFX_KEY) === "on";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync persisted pref once the engine is up
    setSoundOn(on);
    bridge.emit("sound", on);
    const id = new URLSearchParams(location.search).get("level") as PlatformId | null;
    if (id && levels.some((l) => l.id === id)) {
      bridge.emit("goto", id);
      bridge.emit("enter", id);
    } else if (!store.get().introSeen) setIntro(true);
  }, [ready, levels]);

  // ISLAND COMPLETE: all buildings cleared (once)
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      const s = store.get();
      if (s.completeSeen || !levels.every((l) => s.cleared.includes(l.id))) return;
      store.set({ completeSeen: true });
      setComplete(true);
      bridge.emit("complete");
      bridge.emit("pause", true);
      track("island_complete", { coins: s.coins });
    };
    check();
    const unsub = store.subscribe(check);
    return () => {
      unsub();
    };
  }, [ready, levels]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 5000);
    const off = bridge.on("tap", () => setHint(false));
    return () => {
      clearTimeout(t);
      off();
    };
  }, [hint]);

  const closeLevel = useCallback(() => {
    setOpen(null);
    bridge.emit("pause", false);
    const url = new URL(location.href);
    url.searchParams.delete("level");
    history.replaceState(null, "", url);
  }, []);

  const revive = useCallback(() => {
    deadRef.current = false;
    setDead(false);
    bridge.emit("revive");
  }, []);

  const giveUp = useCallback(() => {
    deadRef.current = false;
    setDead(false);
    bridge.emit("respawn");
  }, []);

  const engagement: EngagementApi = {
    watched: (p, id) => {
      engage("watch", p, id);
      if (deadRef.current) revive();
    },
    clicked: (p, url) => {
      engage("click", p, url);
    },
  };

  const toggleSound = () => {
    const on = !soundOn;
    setSoundOn(on);
    localStorage.setItem(SFX_KEY, on ? "on" : "off");
    bridge.emit("sound", on);
  };

  const pauseFor = (m: typeof modal) => {
    setModal(m);
    bridge.emit("pause", !!m || !!open || dead);
  };

  return (
    <EngagementProvider value={engagement}>
      <div className="fixed inset-0 z-20 bg-[#5ec8ff]" role="application" aria-label="Pogi Island game">
        <div ref={host} className="absolute inset-0" />

        {!ready && (
          <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center gap-4 bg-[#5ec8ff]">
            <p className="font-pixel text-sm text-white drop-shadow-[2px_2px_0_#000]">Loading Pogi Island…</p>
            <div className="pixel-box h-5 w-56 bg-white">
              <div className="h-full bg-[#1877F2] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <button type="button" onClick={onQuickView} className="font-pixel text-[9px] text-white underline">
              Skip to quick view
            </button>
          </div>
        )}

        {ready && (
          <>
            <Joystick onFirstMove={() => setHint(false)} />
            <GameHud
              total={levels.length}
              soundOn={soundOn}
              onSound={toggleSound}
              onFollowAll={() => pauseFor("follow")}
              onMenu={() => pauseFor("menu")}
            />

            {chest && !modal && !dead && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[35] flex justify-center">
                <button
                  type="button"
                  onClick={() => bridge.emit("interact")}
                  className="pixel-btn font-pixel pointer-events-auto animate-bounce bg-yellow-300 px-4 py-3 text-[10px] text-black"
                >
                  ▶ OPEN CHEST?
                </button>
              </div>
            )}

            {door && !open && !dead && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[35] flex justify-center">
                <button
                  type="button"
                  onClick={() => bridge.emit("interact")}
                  className="pixel-btn font-pixel pointer-events-auto animate-bounce bg-yellow-300 px-4 py-3 text-[10px] text-black"
                >
                  ▶ ENTER {shortName(levels.find((l) => l.id === door)?.levelName ?? door).toUpperCase()}?
                </button>
              </div>
            )}

            {intro && (
              <IntroDialog
                lines={site.introLines}
                instant={false}
                onDone={() => {
                  setIntro(false);
                  setHint(true);
                  store.set({ introSeen: true });
                }}
              />
            )}
            {hint && (
              <p className="font-pixel pointer-events-none absolute inset-x-0 top-1/3 z-[26] text-center text-[10px] text-white drop-shadow-[2px_2px_0_#000]">
                Drag to move · Tap to go
              </p>
            )}
          </>
        )}

      </div>

      {level && (
        <LevelSheet level={level} onClose={closeLevel}>
          <LevelCard level={level} data={data} />
        </LevelSheet>
      )}

      {dead && <ContinueScreen data={data} onGiveUp={giveUp} />}

      {complete && !open && (
        <IslandComplete
          coins={store.get().coins}
          total={levels.length}
          onHiddenBeach={() => {
            setComplete(false);
            bridge.emit("pause", false);
            bridge.emit("gotoSecret");
          }}
          onClose={() => {
            setComplete(false);
            bridge.emit("pause", false);
          }}
        />
      )}

      {modal === "secret" && (
        <Modal title="🏝️ HIDDEN BEACH" onClose={() => pauseFor(null)}>
          <p className="text-[15px] leading-relaxed text-zinc-800">{data.secret.message}</p>
          <a
            href={data.secret.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("outbound", { platform: "secret", source: "chest" })}
            className="pixel-btn font-pixel mt-4 block bg-yellow-300 py-3 text-center text-[10px] text-black"
          >
            {data.secret.linkLabel.toUpperCase()} ▶
          </a>
          <div className="mt-3">
            <ShareButtons coins={store.get().coins} source="secret" />
          </div>
        </Modal>
      )}
      {modal === "share" && (
        <Modal title="SHARE MY SCORE" onClose={() => pauseFor(null)}>
          <p className="mb-3 text-sm text-zinc-700">
            {store.get().cleared.length}/{levels.length} worlds · {store.get().coins} coins
          </p>
          <ShareButtons coins={store.get().coins} source="menu" />
        </Modal>
      )}

      {modal === "follow" && <FollowAll levels={levels} onClose={() => pauseFor(null)} />}
      {modal === "menu" && (
        <Modal title="MENU" onClose={() => pauseFor(null)}>
          <div className="grid gap-2">
            <button type="button" className="pixel-btn font-pixel bg-white py-3 text-[10px]" onClick={() => pauseFor("follow")}>
              👥 FOLLOW ALL
            </button>
            <button type="button" className="pixel-btn font-pixel bg-white py-3 text-[10px]" onClick={() => pauseFor("share")}>
              📣 SHARE MY SCORE
            </button>
            <button type="button" className="pixel-btn font-pixel bg-white py-3 text-[10px]" onClick={onQuickView}>
              📋 QUICK VIEW
            </button>
            <button
              type="button"
              className="pixel-btn font-pixel bg-white py-3 text-[10px]"
              onClick={() => {
                store.reset();
                bridge.emit("newgame");
                pauseFor(null);
              }}
            >
              🔄 NEW GAME
            </button>
            <button type="button" className="pixel-btn font-pixel bg-white py-3 text-[10px]" onClick={() => pauseFor("credits")}>
              ⭐ CREDITS
            </button>
          </div>
        </Modal>
      )}
      {modal === "credits" && (
        <Modal title="CREDITS" onClose={() => pauseFor(null)}>
          <p className="text-sm text-zinc-800">
            Art &amp; audio: <strong>Ninja Adventure</strong> by Pixel-boy &amp; AAA (CC0).{" "}
            <a className="underline" href="https://pixel-boy.itch.io/ninja-adventure-asset-pack" target="_blank" rel="noopener noreferrer">
              pixel-boy.itch.io
            </a>
          </p>
          <p className="mt-2 text-sm text-zinc-800">Jeepney, coconut tree, lamok &amp; ipis: made for Pogi Island.</p>
        </Modal>
      )}
    </EngagementProvider>
  );
}
