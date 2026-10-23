import type { MetadataRoute } from "next";
import { site } from "@/site.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: site.brand,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#3aa0ff",
    theme_color: "#3aa0ff",
    categories: ["education", "entertainment", "games"],
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
