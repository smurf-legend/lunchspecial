import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import Link from "next/link";
import { notFound } from "next/navigation";

const VALID_REGIONS = ["Central", "North", "East", "South", "West"];

export default async function RegionPage({ params }: { params: { region: string } }) {
  const region = VALID_REGIONS.find((r) => r.toLowerCase() === params.region.toLowerCase());
  if (!region) notFound();

  const [specials, suburbs] = await Promise.all([
    prisma.special.findMany({
      where: {
        hidden: false,
        OR: [{ suburbs: { some: { suburb: { region } } } }, { chainWide: true }],
      },
      orderBy: { score: "desc" },
      take: 20,
      include: {
        suburbs: { include: { suburb: true } },
        categories: { include: { category: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.suburb.findMany({ where: { region }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Lunch specials — {region} Sydney</h1>
      <p className="text-sm text-gray-500 mb-4">
        Covering {suburbs.length} suburbs including{" "}
        {suburbs.slice(0, 5).map((s) => s.name).join(", ")}
        {suburbs.length > 5 ? " and more" : ""}
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {suburbs.map((s) => (
          <Link
            key={s.slug}
            href={`/suburbs/${s.slug}`}
            className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
          >
            {s.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {specials.map((special) => (
          <SpecialCard key={special.id} special={special as any} />
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No lunch specials in {region} Sydney yet — be the first to post one.
          </p>
        )}
      </div>
    </div>
  );
}
