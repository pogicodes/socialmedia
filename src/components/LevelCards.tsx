"use client";

import { track } from "@vercel/analytics";
import Image from "next/image";
import { useEffect, useState } from "react";
import { textOn } from "@/lib/color";
import { facebookEmbed, tiktokEmbed } from "@/lib/embeds";
import type { HubData, Level, LevelStats, PlatformId, Post, Repo, Video } from "@/lib/types";
import { useEngagement, useWatchTimer } from "./engagement";

/** Reports a "watch" after 15 visible seconds. Key it by content id to reset per item. */
function WatchTracker({ active, platform, id }: { active: boolean; platform: PlatformId; id: string }) {
  const eng = useEngagement();
  useWatchTimer(active, () => eng.watched(platform, id));
  return null;
}

const fmt = new Intl.NumberFormat("en", { notation: "compact" });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

function Stats({ stats, id }: { stats?: LevelStats; id: Level["id"] }) {
  if (!stats) return null;
  const items: [string, number | undefined][] =
    id === "youtube"
      ? [["SUBS", stats.followers], ["VIDEOS", stats.posts], ["VIEWS", stats.views]]
      : [["FOLLOWERS", stats.followers], ["POSTS", stats.posts]];
  const shown = items.filter(([, v]) => typeof v === "number" && v > 0);
  if (!shown.length) return null;
  return (
    <div className="mb-3">
      <dl className="flex flex-wrap gap-2">
        {shown.map(([k, v]) => (
          <div key={k} className="pixel-box bg-zinc-900 px-2 py-1 text-white">
            <dt className="font-pixel inline text-[8px] text-yellow-300">{k} </dt>
            <dd className="font-pixel inline text-[10px]">{fmt.format(v!)}</dd>
          </div>
        ))}
      </dl>
      {stats.asOf && (
        <p className="mt-1 text-[11px] text-zinc-500">as of {fmtDate(stats.asOf)}</p>
      )}
    </div>
  );
}

function Cta({ level, href }: { level: Level; href?: string }) {
  const eng = useEngagement();
  return (
    <a
      href={href ?? level.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        track("outbound", { platform: level.id, source: "card_cta" });
        eng.clicked(level.id, level.url);
      }}
      className="pixel-btn font-pixel mb-4 flex w-full items-center justify-center gap-2 py-4 text-sm"
      style={{ backgroundColor: level.color, color: textOn(level.color) }}
    >
      <span className={textOn(level.color) === "#fff" ? "drop-shadow-[2px_2px_0_#000]" : ""}>
        {level.cta} ▶
      </span>
    </a>
  );
}

/** Click-to-play (or autoplay) YouTube player + title. Key it by video id to reset. */
function VideoPlayer({ video, autoPlay = false }: { video: Video; autoPlay?: boolean }) {
  const [playing, setPlaying] = useState(autoPlay);
  useEffect(() => {
    if (autoPlay) track("video_play", { id: video.id, source: "treasure" });
  }, [autoPlay, video.id]);
  return (
    <>
      <div className="pixel-box relative aspect-video overflow-hidden bg-black">
        <WatchTracker key={video.id} active={playing} platform="youtube" id={video.id} />
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="group absolute inset-0"
            onClick={() => {
              setPlaying(true);
              track("video_play", { id: video.id });
            }}
            aria-label={`Play ${video.title}`}
          >
            <Image src={video.thumbnail} alt="" fill sizes="(max-width: 640px) 100vw, 560px" className="object-cover" />
            <span className="pixel-btn absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center bg-[#FF0033] text-2xl text-white transition-transform group-hover:scale-110">
              ▶
            </span>
          </button>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{video.title}</p>
    </>
  );
}

function YouTubeCard({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState(0);
  const video = videos[active];

  return (
    <>
      {video && <VideoPlayer key={video.id} video={video} />}

      {videos.length > 1 && (
        <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
          {videos.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={v.title}
              aria-current={i === active}
              className={`relative aspect-video w-32 shrink-0 snap-start overflow-hidden border-4 ${i === active ? "border-yellow-400" : "border-black"}`}
            >
              <Image src={v.thumbnail} alt="" fill sizes="128px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function RepoLink({ repo: r }: { repo: Repo }) {
  const eng = useEngagement();
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        track("outbound", { platform: "github", source: "repo" });
        eng.clicked("github", r.url);
      }}
      className="pixel-box block bg-white p-3 transition-transform hover:-translate-y-0.5"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden>🗡️</span>
          <span className="font-pixel truncate text-[10px] text-zinc-900">{r.name}</span>
        </span>
        <span className="shrink-0 text-xs text-zinc-600">★ {r.stars}</span>
      </span>
      {r.description && (
        <span className="mt-1 line-clamp-2 block text-sm text-zinc-700">{r.description}</span>
      )}
      {r.language && (
        <span className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
          <span
            className="inline-block size-2.5 rounded-full border border-black/30"
            style={{ backgroundColor: r.languageColor ?? "#999" }}
          />
          {r.language}
        </span>
      )}
    </a>
  );
}

function GitHubCard({ repos }: { repos: Repo[] }) {
  return (
    <>
      {repos.length > 0 && (
        <>
          <h3 className="font-pixel text-[10px] text-zinc-500">QUEST LOG</h3>
          <ul className="mt-2 space-y-2">
            {repos.map((r) => (
              <li key={r.name}>
                <RepoLink repo={r} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Vertical (reel/short) embed that only loads on tap — no third-party scripts until then. */
export function VerticalEmbed({
  level,
  src,
  title,
  onPlay,
  autoPlay = false,
}: {
  level: Pick<Level, "id" | "color">;
  src: string;
  title: string;
  onPlay?: () => void;
  /** Load the player right away (e.g. opened from a treasure chest) instead of waiting for a tap. */
  autoPlay?: boolean;
}) {
  const [playing, setPlaying] = useState(autoPlay);
  useEffect(() => {
    if (autoPlay) track("video_play", { platform: level.id, source: "treasure" });
  }, [autoPlay, level.id]);
  return (
    <div className="pixel-box relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden bg-black">
      <WatchTracker active={playing} platform={level.id} id={src} />
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={src}
          title={title}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            onPlay?.();
            track("video_play", { platform: level.id });
          }}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-4 text-white"
          style={{ background: `linear-gradient(160deg, ${level.color}, #111)` }}
          aria-label={title}
        >
          <span
            className="pixel-btn grid size-16 place-items-center bg-white text-2xl transition-transform group-hover:scale-110"
            style={{ color: level.color }}
          >
            ▶
          </span>
          <span className="font-pixel px-4 text-center text-[10px] leading-relaxed drop-shadow-[2px_2px_0_#000]">
            {title.toUpperCase()}
          </span>
        </button>
      )}
    </div>
  );
}

export function embedFor(level: Pick<Level, "id">, url: string) {
  if (level.id === "facebook") return facebookEmbed(url);
  if (level.id === "tiktok") return tiktokEmbed(url);
  return null;
}

function PostLink({ level, post: p }: { level: Level; post: Post }) {
  const eng = useEngagement();
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        track("outbound", { platform: level.id, source: "post" });
        eng.clicked(level.id, p.url);
      }}
      className="pixel-box flex items-center justify-between gap-3 bg-white p-3 text-sm text-zinc-900 hover:bg-yellow-50"
    >
      <span className="line-clamp-2">{p.title}</span>
      <span aria-hidden>→</span>
    </a>
  );
}

function SocialCard({ level, posts }: { level: Level; posts: Post[] }) {
  const featured = posts.find((p) => embedFor(level, p.url));
  const featuredSrc = featured ? embedFor(level, featured.url) : null;
  const links = posts.filter((p) => p !== featured);

  return (
    <>
      {featured && featuredSrc && (
        <div className="mb-3">
          <VerticalEmbed
            level={level}
            src={featuredSrc}
            title={level.id === "facebook" ? "Watch latest reel" : "Watch latest video"}
          />
        </div>
      )}
      {links.length > 0 && (
        <>
          <h3 className="font-pixel text-[10px] text-zinc-500">LATEST</h3>
          <ul className="mt-2 space-y-2">
            {links.map((p) => (
              <li key={p.url}>
                <PostLink level={level} post={p} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Content({ level, data }: { level: Level; data: HubData }) {
  if (level.id === "youtube") return <YouTubeCard videos={data.videos} />;
  if (level.id === "github") return <GitHubCard repos={data.repos} />;
  return <SocialCard level={level} posts={data.posts[level.id] ?? []} />;
}

const ctaHref = (level: Level) => (level.id === "youtube" ? `${level.url}?sub_confirmation=1` : undefined);

/** Titles of a room's treasures, in the order `Treasure` indexes them. */
export function treasureTitles(level: Level, data: HubData): string[] {
  if (level.id === "youtube") return data.videos.map((v) => v.title);
  if (level.id === "github") return data.repos.map((r) => r.name);
  return (data.posts[level.id] ?? []).map((p) => p.title);
}

/** One room treasure: a single video / repo / post, then the follow CTA. */
export function Treasure({ level, data, index }: { level: Level; data: HubData; index: number }) {
  let body: React.ReactNode = null;
  if (level.id === "youtube") {
    const v = data.videos[index];
    if (v) body = <VideoPlayer key={v.id} video={v} autoPlay />;
  } else if (level.id === "github") {
    const r = data.repos[index];
    if (r) body = <RepoLink repo={r} />;
  } else {
    const p = data.posts[level.id]?.[index];
    const src = p && embedFor(level, p.url);
    if (p)
      body = src ? (
        <>
          <VerticalEmbed key={p.url} level={level} src={src} title={p.title} autoPlay />
          <div className="mt-3">
            <PostLink level={level} post={p} />
          </div>
        </>
      ) : (
        <PostLink level={level} post={p} />
      );
  }
  return (
    <>
      {body}
      <div className="mt-4">
        <Cta level={level} href={ctaHref(level)} />
      </div>
    </>
  );
}

/** Stats + CTA first (above the fold), then content. */
export function LevelCard({ level, data }: { level: Level; data: HubData }) {
  return (
    <>
      <Stats stats={level.stats} id={level.id} />
      <Cta level={level} href={ctaHref(level)} />
      <Content level={level} data={data} />
    </>
  );
}
