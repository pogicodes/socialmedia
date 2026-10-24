import { platformIds, site } from "@/site.config";
import type { Level, PlatformId, Post, Repo, Secret } from "./types";

const API_URL = process.env.TEABLE_API_URL ?? "https://app.teable.ai";

interface TeableRecord {
  id: string;
  fields: Record<string, unknown>;
}

async function fetchRecords(tableId: string): Promise<TeableRecord[] | null> {
  const token = process.env.TEABLE_API_TOKEN;
  if (!token) return null;

  // Personal access tokens are capped at 100 records per request → paginate with skip.
  const PAGE = 100;
  const MAX_PAGES = 10;
  const all: TeableRecord[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`/api/table/${tableId}/record`, API_URL);
    url.searchParams.set("fieldKeyType", "name");
    url.searchParams.set("take", String(PAGE));
    url.searchParams.set("skip", String(page * PAGE));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Teable ${tableId}: ${res.status} ${body.slice(0, 200)}`);
    }
    const { records } = (await res.json()) as { records: TeableRecord[] };
    all.push(...records);
    if (records.length < PAGE) break;
  }
  return all;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);

/**
 * Level overrides from Teable `Socials`. Returns null when Teable is
 * unavailable so callers fall back to hardcoded levels.
 */
export async function getTeableLevels(): Promise<
  (Partial<Omit<Level, "id">> & { id: PlatformId; visible: boolean })[] | null
> {
  const records = await fetchRecords(site.teable.socialsTableId);
  if (!records) return null;

  return records.flatMap(({ fields: f }) => {
    const id = platformIds[str(f["Platform"]) ?? ""];
    if (!id) return [];
    const retrieved = f["Profile status"] === "Retrieved";
    return [
      {
        id,
        visible: f["Show on site"] === true,
        platform: str(f["Platform"]),
        handle: str(f["Handle"]),
        url: str(f["Profile URL"]),
        pitch: str(f["Pitch"]),
        cta: str(f["CTA label"]),
        color: str(f["Color"]),
        order: num(f["Map order"]),
        stats: retrieved
          ? {
              followers: num(f["Followers / subscribers"]),
              posts: num(f["Posts / videos"]),
              views: num(f["Total views"]),
              asOf: str(f["Last checked"]),
            }
          : undefined,
      },
    ];
  });
}

/** Latest 3 published posts per platform (YouTube excluded — RSS handles it). */
export async function getTeablePosts(): Promise<
  Partial<Record<PlatformId, Post[]>> | null
> {
  const records = await fetchRecords(site.teable.postsTableId);
  if (!records) return null;

  const byPlatform: Partial<Record<PlatformId, Post[]>> = {};
  for (const { fields: f } of records) {
    const id = platformIds[str(f["Platform"]) ?? ""];
    const url = str(f["Published URL"]);
    if (!id || id === "youtube" || !url) continue;
    if (f["Publishing status"] !== "Published") continue;
    (byPlatform[id] ??= []).push({
      title: str(f["Platform title"]) ?? str(f["Post"]) ?? "Untitled",
      url,
      published: str(f["Published at"]) ?? str(f["Published date"]) ?? null,
    });
  }

  for (const id of Object.keys(byPlatform) as PlatformId[]) {
    byPlatform[id] = byPlatform[id]!
      .sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""))
      .slice(0, 3);
  }
  return byPlatform;
}

/** Repos marked `Show on site`, sorted by `Order` then stars (max 6). Filled by a crawler automation. */
export async function getTeableRepos(): Promise<Repo[] | null> {
  const records = await fetchRecords(site.teable.reposTableId);
  if (!records) return null;

  return records
    .filter(({ fields: f }) => f["Show on site"] === true && str(f["Name"]) && str(f["URL"]))
    .map(({ fields: f }) => ({
      order: num(f["Order"]) ?? Number.MAX_SAFE_INTEGER,
      repo: {
        name: str(f["Name"])!,
        url: str(f["URL"])!,
        description: str(f["Description"]) ?? null,
        stars: num(f["Stars"]) ?? 0,
        language: str(f["Language"]) ?? null,
        languageColor: str(f["Language color"]) ?? null,
      },
    }))
    .sort((a, b) => a.order - b.order || b.repo.stars - a.repo.stars)
    .slice(0, 6)
    .map((x) => x.repo);
}

/** First active row of `Secret` (hidden-beach reward). */
export async function getTeableSecret(): Promise<Secret | null> {
  const records = await fetchRecords(site.teable.secretTableId);
  const f = records?.find((r) => r.fields["Active"] === true)?.fields;
  const message = str(f?.["Message"]);
  const linkUrl = str(f?.["Link URL"]);
  if (!message || !linkUrl) return null;
  return { message, linkUrl, linkLabel: str(f?.["Link label"]) ?? "Open" };
}
