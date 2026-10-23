import { site } from "@/site.config";
import type { Video } from "./types";

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];

/** Latest long-form videos from the public RSS feed. Shorts are excluded. */
export async function getVideos(limit = 5): Promise<Video[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${site.youtubeChannelId}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`YouTube RSS: ${res.status}`);
  const xml = await res.text();

  const entries = xml.split("<entry>").slice(1);
  return entries
    .map((e) => {
      const id = tag(e, "yt:videoId") ?? "";
      const href = e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? "";
      return {
        id,
        href,
        title: decode(tag(e, "title") ?? ""),
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        published: tag(e, "published") ?? "",
      };
    })
    .filter((v) => v.id && !v.href.includes("/shorts/"))
    .slice(0, limit)
    .map((v) => ({
      id: v.id,
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnail,
      published: v.published,
    }));
}
