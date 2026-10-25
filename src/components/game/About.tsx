"use client";

import { track } from "@vercel/analytics";
import { textOn } from "@/lib/color";
import { about, site } from "@/site.config";

/** What Pogi Island is. Shared by the HUD "About" modal and the about-house notice board. */
export function AboutIsland() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-zinc-800">
      <p>
        Pogi Island is a small game and link hub made by{" "}
        <a className="underline" href={site.author.url} target="_blank" rel="noopener noreferrer">
          {site.author.name}
        </a>{" "}
        ({site.brand}), a software engineer born in the Philippines, now living and working in Sweden,
        who makes coding tutorials and dev vlogs.
      </p>
      <p>
        It is open source. Read the code, report a bug, or fork it and build your own island.
      </p>
      <a
        href={site.repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("outbound", { platform: "github", source: "about" })}
        className="pixel-btn font-pixel block bg-zinc-900 py-3 text-center text-[10px] text-white"
      >
        VIEW SOURCE ON GITHUB ▶
      </a>
      <p className="text-zinc-600">
        Built with Next.js, React, Phaser and Tailwind. Videos, posts and repos are pulled live from each
        platform. Your progress is saved only in this browser — no account needed.
      </p>
      <p className="text-zinc-600">Art &amp; audio credits are in Menu → Credits.</p>
    </div>
  );
}

/** The about house's notice board: link to carlogino.com first, then what this site is. */
export function AboutBoard() {
  return (
    <>
      <a
        href={about.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("outbound", { platform: "about", source: "card_cta" })}
        className="pixel-btn font-pixel mb-4 flex w-full items-center justify-center gap-2 py-4 text-sm"
        style={{ backgroundColor: about.color, color: textOn(about.color) }}
      >
        <span className={textOn(about.color) === "#fff" ? "drop-shadow-[2px_2px_0_#000]" : ""}>
          VISIT CARLOGINO.COM ▶
        </span>
      </a>
      <AboutIsland />
    </>
  );
}

function Entry({ title, subtitle, dates }: { title: string; subtitle: string; dates: string }) {
  return (
    <li className="pixel-box bg-white p-3">
      <p className="font-pixel text-[10px] leading-snug text-zinc-900">{title}</p>
      <p className="mt-1 text-sm text-zinc-700">{subtitle}</p>
      <p className="text-xs text-zinc-500">{dates}</p>
    </li>
  );
}

/** One about-house chest: 0 work experience, 1 education, 2 skills (see `aboutTreasures`). */
export function AboutTreasure({ index }: { index: number }) {
  let body: React.ReactNode = null;
  if (index === 0)
    body = (
      <ul className="space-y-2">
        {about.work.map((w) => (
          <Entry key={w.company} title={w.company} subtitle={w.role} dates={w.dates} />
        ))}
      </ul>
    );
  else if (index === 1)
    body = (
      <ul className="space-y-2">
        {about.education.map((e) => (
          <Entry key={e.school} title={e.school} subtitle={e.degree} dates={e.dates} />
        ))}
      </ul>
    );
  else if (index === 2)
    body = (
      <dl className="space-y-3">
        {about.skills.map((s) => (
          <div key={s.group}>
            <dt className="font-pixel text-[10px] text-zinc-500">{s.group.toUpperCase()}</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {s.items.map((item) => (
                <span key={item} className="pixel-box bg-white px-2 py-1 text-sm text-zinc-900">
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    );
  return (
    <>
      {body}
      <a
        href={`${about.url}/resume`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("outbound", { platform: "about", source: "treasure" })}
        className="pixel-btn font-pixel mt-4 block bg-white py-3 text-center text-[10px] text-black"
      >
        FULL RESUME ▶
      </a>
    </>
  );
}
