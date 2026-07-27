import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditSpecialForm from "@/components/EditSpecialForm";
import { idFromSlug } from "@/lib/slugify";

export default async function EditMySpecialPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p className="mb-3">You need to be logged in to edit a special.</p>
        <Link href="/login" className="text-orange-600 underline font-medium">
          Log in
        </Link>
      </div>
    );
  }

  const id = idFromSlug(params.id);
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role;

  const [special, categories] = await Promise.all([
    prisma.special.findUnique({
      where: { id },
      include: { suburbs: { include: { suburb: true } }, categories: { include: { category: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);

  if (!special) notFound();

  if (special.authorId !== userId && role !== "admin") {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p>You can only edit specials you posted.</p>
      </div>
    );
  }

  return <EditSpecialForm special={special as any} categories={categories} apiBase="/api/specials" />;
}
