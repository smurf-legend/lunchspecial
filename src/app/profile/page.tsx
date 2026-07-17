import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AccountForm from "@/components/AccountForm";
import ChangeEmailForm from "@/components/ChangeEmailForm";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import DeleteAccountForm from "@/components/DeleteAccountForm";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

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

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { name: true, email: true, marketingOptIn: true },
  });

  if (!user) return null;

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-6">
      <div className="bg-white p-6 rounded-lg border">
        <h1 className="text-xl font-bold mb-4">Profile</h1>
        <AccountForm initialName={user.name} initialMarketingOptIn={user.marketingOptIn} />
      </div>
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-bold mb-4">Email address</h2>
        <ChangeEmailForm currentEmail={user.email} />
      </div>
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-bold mb-4">Password</h2>
        <ChangePasswordForm />
      </div>
      <div className="bg-white p-6 rounded-lg border border-red-200">
        <h2 className="text-lg font-bold mb-4 text-red-700">Danger zone</h2>
        <DeleteAccountForm />
      </div>
    </div>
  );
}
