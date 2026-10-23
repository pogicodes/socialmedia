import { cacheLife } from "next/cache";
import { fallbackLevels } from "@/site.config";
import { getRecentRepos } from "./github";
import { iconPaths } from "./icons";
import { getTeableLevels, getTeablePosts, getTeableRepos } from "./teable";
import type { HubData, Level } from "./types";
import { getVideos } from "./youtube";

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[hub] ${label} failed, using fallback`, err);
    return fallback;
  }
}

async function getLevels(): Promise<Level[]> {
  const overrides = await safe("teable levels", getTeableLevels, null);

  const levels = fallbackLevels.flatMap((base): Level[] => {
    const o = overrides?.find((x) => x.id === base.id);
    if (overrides && o && !o.visible) return [];
    const merged = { ...base };
    if (o) {
      for (const [k, v] of Object.entries(o)) {
        if (v !== undefined && k !== "visible" && k !== "stats") {
          (merged as Record<string, unknown>)[k] = v;
        }
      }
    }
    return [{ ...merged, iconPath: iconPaths[base.id], stats: o?.stats }];
  });

  return levels.sort((a, b) => a.order - b.order);
}

async function getRepos() {
  const fromTeable = await safe("teable repos", getTeableRepos, null);
  if (fromTeable?.length) return fromTeable;
  return safe("github", getRecentRepos, []);
}

/** All hub data, cached and revalidated hourly (ISR). Never throws. */
export async function getHubData(): Promise<HubData> {
  "use cache";
  cacheLife("hours");

  const [levels, videos, repos, posts] = await Promise.all([
    getLevels(),
    safe("youtube", () => getVideos(5), []),
    getRepos(),
    safe("teable posts", getTeablePosts, null),
  ]);

  return { levels, videos, repos, posts: posts ?? {} };
}
