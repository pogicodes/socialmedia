import type { Level, PlatformId } from "@/lib/types";

/**
 * Hardcoded identity + fallbacks. Edit here; it rarely changes.
 * Live level config comes from Teable `Socials` and overrides `fallbackLevels`.
 */
export const site = {
  brand: "PogiCodes",
  byline: "by Carlo Gino Catapang",
  url: "https://pogi.codes",
  title: "PogiCodes — by Carlo Gino Catapang",
  description:
    "Coding videos, shorts & open source by Carlo Gino Catapang. Pick a level and play.",
  handle: "pogicodes",
  tagline: "Pick a channel. Tara, follow tayo!",
  introLines: [
    "Uy! A wild POGI appeared!",
    "Welcome to Pogi Island!",
    "Drag to move · Tap to go ▶",
  ],
  /** Hidden-beach reward fallback (live value comes from Teable `Secret`). */
  secret: {
    message: "Salamat, idol! You found the hidden beach. Here is what I am building next.",
    linkLabel: "See my projects",
    linkUrl: "https://github.com/pogicodes",
  },
  youtubeChannelId: "UCxcrWaR5v29dfMNtnCmp8sQ",
  githubUser: "pogicodes",
  teable: {
    baseId: "bsekboWJc9EkYrxrX6I",
    socialsTableId: "tbl2pOxVFtf9iu05Nhs",
    postsTableId: "tbljNSP6OoJNfgh6GOK",
    reposTableId: "tbl98z25vM4ao3kijj6",
    secretTableId: "tblLdewX1xlberGLnUc",
  },
} as const;

/** Maps Teable `Platform` text → our id. */
export const platformIds: Record<string, PlatformId> = {
  YouTube: "youtube",
  GitHub: "github",
  TikTok: "tiktok",
  Instagram: "instagram",
  X: "x",
  Facebook: "facebook",
};

type FallbackLevel = Omit<Level, "iconPath" | "stats">;

export const fallbackLevels: FallbackLevel[] = [
  {
    id: "facebook",
    platform: "Facebook",
    handle: "@pogicodes",
    url: "https://www.facebook.com/pogicodes",
    levelName: "World 1: Barangay Hall",
    pitch: "Main hangout — reels, updates, and the community",
    cta: "FOLLOW",
    color: "#1877F2",
    order: 1,
  },
  {
    id: "youtube",
    platform: "YouTube",
    handle: "@pogicodes",
    url: "https://www.youtube.com/@pogicodes",
    levelName: "World 2: Sinehan",
    pitch: "Coding tutorials and dev vlogs",
    cta: "SUBSCRIBE",
    color: "#FF0033",
    order: 2,
  },
  {
    id: "tiktok",
    platform: "TikTok",
    handle: "@pogicodes",
    url: "https://www.tiktok.com/@pogicodes",
    levelName: "World 3: Videoke Stage",
    pitch: "Quick coding tips in under a minute",
    cta: "FOLLOW",
    color: "#25F4EE",
    order: 3,
  },
  {
    id: "instagram",
    platform: "Instagram",
    handle: "@pogicodes",
    url: "https://www.instagram.com/pogicodes/",
    levelName: "World 4: Photo Booth",
    pitch: "Behind the scenes and dev life",
    cta: "FOLLOW",
    color: "#E1306C",
    order: 4,
  },
  {
    id: "x",
    platform: "X",
    handle: "@pogicodes",
    url: "https://x.com/pogicodes",
    levelName: "World 5: Chismis Corner",
    pitch: "Hot takes and coding threads",
    cta: "FOLLOW",
    color: "#1D9BF0",
    order: 5,
  },
  {
    id: "github",
    platform: "GitHub",
    handle: "@pogicodes",
    url: "https://github.com/pogicodes",
    levelName: "World 6: Code Dojo",
    pitch: "Open source projects and experiments",
    cta: "FOLLOW",
    color: "#8B5CF6",
    order: 6,
  },
];
