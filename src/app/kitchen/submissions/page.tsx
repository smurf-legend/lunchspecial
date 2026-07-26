import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import TipStatusButtons from "@/components/TipStatusButtons";

export default async function SubmissionsPage() {
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

  const submissions = await prisma.specialSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pending = submissions.filter((s) => s.status === "pending");
  const resolved = submissions.filter((s) => s.status !== "pending");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Submitted tips</h1>
        <p className="text-sm text-gray-500">
          Deals sent in via the "Suggest a Special" form — no account, so nothing here is
          verified yet. Check the source, then post it properly through{" "}
          <Link href="/specials/new" className="text-orange-600 hover:underline">
            the normal form
          </Link>{" "}
          and mark it posted below.
        </p>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {pending.map((s) => (
          <div key={s.id} className="flex items-start justify-between flex-wrap p-3 text-sm gap-3">
            <div className="flex gap-3 flex-1 min-w-0">
              {s.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imageUrl} alt="" className="w-16 h-16 object-cover rounded shrink-0" />
              )}
              <div className="min-w-0">
                <p className="whitespace-pre-line">{s.details}</p>
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline text-xs break-all"
                  >
                    {s.link}
                  </a>
                )}
                <p className="text-gray-400 text-xs mt-1">{s.createdAt.toLocaleString()}</p>
              </div>
            </div>
            <TipStatusButtons id={s.id} />
          </div>
        ))}
        {pending.length === 0 && (
          <p className="text-gray-400 text-sm p-4">No pending tips right now.</p>
        )}
      </div>

      {resolved.length > 0 && (
        <details className="bg-white rounded-lg border">
          <summary className="p-3 text-sm font-medium cursor-pointer">
            Resolved ({resolved.length})
          </summary>
          <div className="divide-y border-t">
            {resolved.map((s) => (
              <div key={s.id} className="flex items-center justify-between flex-wrap p-3 text-sm gap-3">
                <p className="text-gray-500 line-clamp-1">{s.details}</p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                    s.status === "posted" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
