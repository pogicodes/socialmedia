import { site } from "@/site.config";
import type { Repo } from "./types";

interface RestRepo {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
  archived: boolean;
}

/** Tokenless fallback: recently pushed public repos. Used only when Teable `Repos` is unavailable or empty. */
export async function getRecentRepos(): Promise<Repo[]> {
  const res = await fetch(
    `https://api.github.com/users/${site.githubUser}/repos?sort=pushed&per_page=30`,
    {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) throw new Error(`GitHub REST: ${res.status}`);
  const repos = (await res.json()) as RestRepo[];
  return repos
    .filter((r) => !r.fork && !r.archived && r.name !== site.githubUser)
    .slice(0, 6)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      stars: r.stargazers_count,
      language: r.language,
      languageColor: null,
    }));
}
