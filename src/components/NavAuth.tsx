"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

export default function NavAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session?.user) {
    const role = (session.user as any).role;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {role === "admin" && (
          <Link href="/admin" className="text-sm underline">
            Admin
          </Link>
        )}
        <NotificationBell />
        <Link href="/profile" className="text-sm">
          Hi, {session.user.name}
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm underline">
          Log out
        </button>
      </div>
    );
  }

  return <Link href="/login">Login</Link>;
}
