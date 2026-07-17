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
          <Link href="/kitchen" className="text-sm underline">
            Admin
          </Link>
        )}
        <NotificationBell />
        <Link href="/favorites" className="text-sm underline" title="Your saved favourites">
          🔖 Favourites
        </Link>
        <Link href="/profile" className="text-sm underline" title="Edit your profile">
          <span className="inline-block grayscale brightness-0 invert">👤</span> Hi, {session.user.name}
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm underline">
          Log out
        </button>
      </div>
    );
  }

  return <Link href="/login">Login</Link>;
}
