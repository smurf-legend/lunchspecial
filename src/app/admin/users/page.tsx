import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminUserRow from "@/components/AdminUserRow";

export default async function AdminUsersPage() {
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

  const currentUserId = (session.user as any).id as string;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { specials: true, comments: true, votes: true } },
    },
  });

  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-orange-600">
          ← Back to admin
        </Link>
        <h1 className="text-2xl font-bold mt-1">Users</h1>
        <p className="text-sm text-gray-500">
          {users.length} users · {adminCount} admin{adminCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {users.map((u) => (
          <AdminUserRow key={u.id} user={u as any} isSelf={u.id === currentUserId} />
        ))}
        {users.length === 0 && <p className="text-gray-400 text-sm p-4">No users yet.</p>}
      </div>
    </div>
  );
}
