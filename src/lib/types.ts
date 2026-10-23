export type PlatformId =
  | "youtube"
  | "github"
  | "tiktok"
  | "instagram"
  | "x"
  | "facebook"
  | "website";

export interface LevelStats {
  followers?: number;
  posts?: number;
  views?: number;
  /** ISO date of the snapshot */
  asOf?: string;
}

export interface Level {
  id: PlatformId;
  platform: string;
  handle: string;
  url: string;
  levelName: string;
  pitch: string;
  cta: string;
  color: string;
  order: number;
  /** SVG path (24x24 viewBox) from simple-icons */
  iconPath: string;
  stats?: LevelStats;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  published: string;
}

export interface Repo {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
  languageColor: string | null;
}

export interface Post {
  title: string;
  url: string;
  published: string | null;
}

export interface Secret {
  message: string;
  linkLabel: string;
  linkUrl: string;
}

export interface HubData {
  levels: Level[];
  videos: Video[];
  repos: Repo[];
  posts: Partial<Record<PlatformId, Post[]>>;
  secret: Secret;
}
