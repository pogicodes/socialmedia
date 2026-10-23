import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { iconPaths } from "@/lib/icons";
import { fallbackLevels, site } from "@/site.config";

export const alt = `${site.brand} — choose a level`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [font, logo] = await Promise.all([
    readFile(join(process.cwd(), "assets/PressStart2P-Regular.ttf")),
    readFile(join(process.cwd(), "public/logo.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(#5ec8ff, #2b7fd9)",
          fontFamily: "PressStart",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            background: "white",
            border: "8px solid black",
            boxShadow: "8px 8px 0 black",
            padding: 8,
          }}
        >
          <img src={logoSrc} width={160} height={160} alt="" />
        </div>
        <div style={{ fontSize: 64, marginTop: 40, textShadow: "6px 6px 0 #000" }}>
          {site.brand}
        </div>
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 40,
          }}
        >
          {fallbackLevels.map((l) => (
            <div
              key={l.id}
              style={{
                width: 72,
                height: 72,
                background: l.color,
                border: "6px solid black",
                borderRadius: 12,
                boxShadow: "0 6px 0 black",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" width={36} height={36} fill="white">
                <path d={iconPaths[l.id]} />
              </svg>
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 24,
            marginTop: 40,
            background: "white",
            color: "black",
            border: "6px solid black",
            padding: "16px 24px",
          }}
        >
          A wild POGI appeared! ▼
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "PressStart", data: font, style: "normal", weight: 400 }] },
  );
}
