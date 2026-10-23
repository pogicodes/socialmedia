import { QuickView } from "@/components/QuickView";
import { getHubData } from "@/lib/data";
import { buildJsonLd, jsonLdScript } from "@/lib/seo";

export default async function Home() {
  const data = await getHubData();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildJsonLd(data)) }}
      />
      <QuickView data={data} />
    </>
  );
}
