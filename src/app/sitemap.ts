import type { MetadataRoute } from "next";
import { getHubData } from "@/lib/data";
import { site } from "@/site.config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { videos } = await getHubData();
  const latest = videos
    .map((v) => Date.parse(v.published))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return [
    {
      url: site.url,
      lastModified: latest ? new Date(latest) : undefined,
      changeFrequency: "daily",
      priority: 1,
      images: [`${site.url}/opengraph-image`, `${site.url}/logo.png`],
      videos: videos.map((v) => ({
        title: v.title,
        thumbnail_loc: v.thumbnail,
        description: `${v.title}, a coding video by ${site.author.name} (${site.brand}).`,
        player_loc: `https://www.youtube-nocookie.com/embed/${v.id}`,
        publication_date: v.published || undefined,
      })),
    },
  ];
}
