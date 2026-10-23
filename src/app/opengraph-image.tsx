import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/site.config";

export const alt = `${site.brand}: play Pogi Island and follow along`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Island preview is pre-rendered by scripts/build-game-assets.mjs (nearest-neighbour, 1200×630). */
export default async function OpengraphImage() {
  const [font, logo, island] = await Promise.all([
    readFile(join(process.cwd(), "assets/PressStart2P-Regular.ttf")),
    readFile(join(process.cwd(), "public/logo.png")),
    readFile(join(process.cwd(), "assets/og-island.png")),
  ]);
  const src = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "PressStart" }}>
        <img src={src(island)} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0 }} />
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 28,
            display: "flex",
            alignItems: "center",
            gap: 24,
            background: "white",
            border: "8px solid black",
            boxShadow: "8px 8px 0 black",
            padding: "12px 22px 12px 12px",
          }}
        >
          <img src={src(logo)} width={72} height={72} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 34, color: "black" }}>{site.brand}</div>
            <div style={{ fontSize: 16, color: "#1877F2" }}>PLAY POGI ISLAND ▶</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "PressStart", data: font, style: "normal", weight: 400 }] },
  );
}
