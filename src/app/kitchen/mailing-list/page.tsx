import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DigestSettingsForm from "@/components/DigestSettingsForm";
import DigestTestSendForm from "@/components/DigestTestSendForm";
import AdminSubscriberRow from "@/components/AdminSubscriberRow";
import { getDigestSettings } from "@/lib/digestSettings";

export default async function MailingListPage() {
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

  const adminEmail = (session.user as any).email as string;

  const [settings, subscribers, suburbs, categories, logs] = await Promise.all([
    getDigestSettings(),
    prisma.user.findMany({
      where: { marketingOptIn: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        preferredSuburb: { select: { name: true } },
        preferredCategorySlugs: true,
      },
    }),
    prisma.suburb.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    prisma.digestLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/kitchen" className="text-sm text-gray-500 hover:text-orange-600">
          ← Back to admin
        </Link>
        <h1 className="text-2xl font-bold mt-1">Mailing list</h1>
        <p className="text-sm text-gray-500">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"} opted in to the deals digest
          {settings.paused && (
            <span className="ml-2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs font-medium">Paused</span>
          )}
        </p>
      </div>

      <section>
        <h2 className="font-bold text-lg mb-3">Digest settings</h2>
        <div className="bg-white rounded-lg border p-4">
          <DigestSettingsForm settings={settings} />
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Send a test digest</h2>
        <div className="bg-white rounded-lg border p-4">
          <DigestTestSendForm suburbs={suburbs} categories={categories} defaultEmail={adminEmail} />
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Subscribers</h2>
        <div className="bg-white rounded-lg border divide-y">
          {subscribers.map((s) => (
            <AdminSubscriberRow key={s.id} subscriber={s as any} />
          ))}
          {subscribers.length === 0 && <p className="text-gray-400 text-sm p-4">No one is opted in yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Send history</h2>
        <div className="bg-white rounded-lg border divide-y">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between flex-wrap gap-2 p-3 text-sm">
              <div>
                <span className="font-medium capitalize">{log.mode}</span>{" "}
                {log.paused && (
                  <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs font-medium">
                    skipped — paused
                  </span>
                )}
                <p className="text-gray-500 text-xs mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
              {!log.paused && (
                <p className="text-gray-500 text-xs">
                  {log.totalEligible} eligible · {log.sent} sent · {log.skipped} skipped · {log.failed} failed
                </p>
              )}
            </div>
          ))}
          {logs.length === 0 && <p className="text-gray-400 text-sm p-4">No digest sends yet.</p>}
        </div>
      </section>
    </div>
  );
}
