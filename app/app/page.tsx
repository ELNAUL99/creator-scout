import ScoutApp from "@/components/ScoutApp";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.demo;
  const judgeDemo = (Array.isArray(raw) ? raw[0] : raw) === "1";
  return <ScoutApp judgeDemo={judgeDemo} />;
}
