import { QuickView } from "@/components/QuickView";
import { getHubData } from "@/lib/data";

export default async function Home() {
  const data = await getHubData();
  return <QuickView data={data} />;
}
