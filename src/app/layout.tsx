import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Press_Start_2P } from "next/font/google";
import { site } from "@/site.config";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const pixel = Press_Start_2P({ variable: "--font-press-start", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s · ${site.brand}` },
  description: site.description,
  applicationName: site.brand,
  authors: [{ name: site.author.name, url: site.author.url }],
  creator: site.author.name,
  publisher: site.author.name,
  keywords: [...site.keywords],
  category: "technology",
  referrer: "origin-when-cross-origin",
  // `?level=…` deep links must not be indexed as separate pages.
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    title: site.title,
    description: site.description,
    url: "/",
    siteName: site.brand,
    locale: site.locale,
    type: "profile",
    firstName: "Carlo Gino",
    lastName: "Catapang",
    username: site.handle,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    site: `@${site.handle}`,
    creator: `@${site.handle}`,
  },
  appleWebApp: { capable: true, title: site.brand, statusBarStyle: "black-translucent" },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.YANDEX_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  other: {
    // Facebook domain verification (Business Manager), optional.
    ...(process.env.FACEBOOK_DOMAIN_VERIFICATION
      ? { "facebook-domain-verification": process.env.FACEBOOK_DOMAIN_VERIFICATION }
      : {}),
  },
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
