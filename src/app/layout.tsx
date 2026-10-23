import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Press_Start_2P } from "next/font/google";
import { site } from "@/site.config";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const pixel = Press_Start_2P({ variable: "--font-press-start", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.url,
    siteName: site.brand,
    type: "website",
  },
  twitter: { card: "summary_large_image", site: `@${site.handle}`, creator: `@${site.handle}` },
};

export const viewport: Viewport = {
  themeColor: "#3aa0ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${pixel.variable} antialiased`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
