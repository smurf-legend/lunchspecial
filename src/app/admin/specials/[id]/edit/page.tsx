import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditSpecialForm from "@/components/EditSpecialForm";

export default async function EditSpecialPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p className="mb-3">You need to be logged in to view this page.</p>
        <Link href="/login" className="text-orange-600 underline font-medium">
          Log in
        </Link>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p>You don't have access to the admin panel.</p>
      </div>
    );
  }

  const [special, suburbs, categories] = await Promise.all([
    prisma.special.findUnique({
      where: { id: params.id },
      include: { suburbs: { include: { suburb: true } }, categories: { include: { category: true } } },
    }),
    prisma.suburb.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true, region: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);

  if (!special) notFound();

  return <EditSpecialForm special={special as any} suburbs={suburbs} categories={categories} />;
}
