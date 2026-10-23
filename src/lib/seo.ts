import { site } from "@/site.config";
import type { HubData } from "./types";

const personId = `${site.url}/#person`;
const websiteId = `${site.url}/#website`;
const pageId = `${site.url}/#profile`;

/** schema.org graph for the hub: WebSite + ProfilePage(Person) + channels + videos. */
export function buildJsonLd({ levels, videos }: HubData) {
  const sameAs = levels.map((l) => l.url);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: site.url,
        name: site.brand,
        alternateName: ["Pogi Codes", "pogi.codes"],
        description: site.description,
        inLanguage: "en",
        publisher: { "@id": personId },
      },
      {
        "@type": "Person",
        "@id": personId,
        name: site.author.name,
        alternateName: site.author.alternateName,
        jobTitle: site.author.jobTitle,
        nationality: site.author.nationality,
        url: site.url,
        image: `${site.url}/logo.png`,
        description: site.description,
        knowsAbout: ["Software Engineering", "Web Development", "JavaScript", "TypeScript", "React", "Next.js"],
        sameAs: [...new Set([site.author.url, ...sameAs])],
      },
      {
        "@type": "ProfilePage",
        "@id": pageId,
        url: site.url,
        name: site.title,
        description: site.description,
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": personId },
        primaryImageOfPage: `${site.url}/opengraph-image`,
        hasPart: {
          "@type": "ItemList",
          name: `${site.brand} channels`,
          itemListElement: levels.map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `${l.platform} (${l.handle})`,
            description: l.pitch,
            url: l.url,
          })),
        },
      },
      ...videos.filter((v) => v.published).map((v) => ({
        "@type": "VideoObject",
        "@id": `${site.url}/#video-${v.id}`,
        name: v.title,
        description: `${v.title}, a coding video by ${site.author.name} (${site.brand}).`,
        thumbnailUrl: v.thumbnail,
        uploadDate: v.published,
        contentUrl: v.url,
        embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`,
        author: { "@id": personId },
        isPartOf: { "@id": pageId },
      })),
    ],
  };
}

/** Serialise JSON-LD safely for an inline <script> (prevents `</script>` breakouts). */
export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
