import type { Level, PlatformId } from "@/lib/types";

/**
 * Hardcoded identity + fallbacks. Edit here; it rarely changes.
 * Live level config comes from Teable `Socials` and overrides `fallbackLevels`
 * (except `levelName`: place names are owned here).
 */
export const site = {
  brand: "PogiCodes",
  byline: "by Carlo Gino Catapang",
  url: "https://pogi.codes",
  title: "PogiCodes — Coding Tutorials & Dev Vlogs by Carlo Gino Catapang",
  description:
    "Coding tutorials, dev vlogs, quick shorts & open source by Filipino developer Carlo Gino Catapang (PogiCodes). Explore Pogi Island and follow on every platform.",
  handle: "pogicodes",
  author: {
    name: "Carlo Gino Catapang",
    alternateName: "PogiCodes",
    jobTitle: "Software Engineer & Coding Content Creator",
    url: "https://carlogino.com",
    nationality: "Filipino",
  },
  locale: "en_PH",
  keywords: [
    "PogiCodes",
    "Pogi Codes",
    "Carlo Gino Catapang",
    "coding tutorials",
    "programming videos",
    "web development",
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "open source",
    "Filipino developer",
    "Pinoy programmer",
    "tech content creator",
    "coding shorts",
    "dev vlog",
  ],
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
  /** Source code of this site (public). */
  repoUrl: "https://github.com/pogicodes/socialmedia",
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
  Website: "website",
  Threads: "threads",
};

type FallbackLevel = Omit<Level, "iconPath" | "stats">;

export const fallbackLevels: FallbackLevel[] = [
  {
    id: "facebook",
    platform: "Facebook",
    handle: "@pogicodes",
    url: "https://www.facebook.com/pogicodes",
    levelName: "World 1: Facebook Hall",
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
    levelName: "World 2: YouTube Cinema",
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
    levelName: "World 3: TikTok Stage",
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
    levelName: "World 4: Instagram Studio",
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
    levelName: "World 5: X Corner",
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
    levelName: "World 6: GitHub Dojo",
    pitch: "Open source projects and experiments",
    cta: "FOLLOW",
    color: "#8B5CF6",
    order: 6,
  },
  {
    id: "website",
    platform: "Website",
    handle: "carlogino.com",
    url: "https://carlogino.com/blog",
    levelName: "World 7: Blog Library",
    pitch: "Long-form tutorials and dev write-ups",
    cta: "READ",
    color: "#16A34A",
    order: 7,
  },
  {
    id: "threads",
    platform: "Threads",
    handle: "@pogicodes",
    url: "https://www.threads.com/@pogicodes",
    levelName: "World 8: Threads Lounge",
    pitch: "Casual dev chats and quick updates",
    cta: "FOLLOW",
    color: "#101010",
    order: 8,
  },
];

/**
 * "Bahay ni Pogi": the about-me house at the top of the main island. Not a world:
 * no quest, no badge, not needed for ISLAND COMPLETE. The board is about this site,
 * the chests are the resume (hand-copied from carlogino.com/resume).
 */
export const about = {
  name: "Bahay ni Pogi",
  color: "#EA580C",
  url: "https://carlogino.com",
  work: [
    { company: "Tre", role: "Senior Full Stack Developer", dates: "Jun 2023 – Present" },
    { company: "Devoteam Creative Tech", role: "Senior Full Stack Developer", dates: "Aug 2022 – May 2023" },
    { company: "NE Digital", role: "Senior Software Engineer", dates: "Sep 2021 – Jul 2022" },
    { company: "Development Bank of Singapore", role: "UI Java Full Stack Developer", dates: "Mar 2019 – Sep 2021" },
    { company: "Capgemini", role: "Associate Consultant", dates: "Sep 2017 – Nov 2018" },
    { company: "Nokia", role: "Research and Development Engineer", dates: "Aug 2014 – Sep 2017" },
  ],
  education: [
    { school: "AMA Computer College", degree: "BS Computer Engineering", dates: "Jun 2010 – Mar 2014" },
    { school: "Batangas State University", degree: "BS General Engineering", dates: "Jun 2007 – Mar 2010" },
    { school: "Our Lady of Caysasay Academy", degree: "High School", dates: "Jun 2004 – Mar 2007" },
  ],
  skills: [
    { group: "AI", items: ["AI development", "Claude", "Codex", "Copilot"] },
    { group: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind", "Redux", "React Native", "GraphQL"] },
    { group: "Backend", items: ["Node.js", "Java"] },
    { group: "Testing", items: ["Playwright", "K6"] },
    { group: "Hosting", items: ["Vercel", "AWS", "Heroku"] },
    { group: "Tools", items: ["GitHub", "VS Code"] },
  ],
};

/** Chest order in the about house; `AboutTreasure` indexes the same way. */
export const aboutTreasures = ["Work Experience", "Education", "Skills"] as const;
