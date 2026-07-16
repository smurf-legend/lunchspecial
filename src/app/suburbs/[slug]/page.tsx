import { prisma } from "@/lib/prisma";
import SpecialCard from "@/components/SpecialCard";
import { notFound } from "next/navigation";

export default async function SuburbPage({ params }: { params: { slug: string } }) {
  const suburb = await prisma.suburb.findUnique({ where: { slug: params.slug } });
  if (!suburb) notFound();

  const specials = await prisma.special.findMany({
    where: {
      hidden: false,
      OR: [{ suburbs: { some: { suburbId: suburb.id } } }, { chainWide: true }],
    },
    orderBy: { score: "desc" },
    take: 20,
    include: {
      suburbs: { include: { suburb: true } },
      categories: { include: { category: true } },
      _count: { select: { comments: true } },
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Lunch specials in {suburb.name}</h1>
      <p className="text-sm text-gray-500 mb-4">{suburb.postcode}, {suburb.state}</p>
      <div className="flex flex-col gap-3">
        {specials.map((special) => (
          <SpecialCard key={special.id} special={special as any} contextSuburbSlug={suburb.slug} />
        ))}
        {specials.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No lunch specials in {suburb.name} yet — be the first to post one.
          </p>
        )}
      </div>
    </div>
  );
}
