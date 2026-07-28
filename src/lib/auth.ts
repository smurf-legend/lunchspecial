import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { checkRateLimit, getClientIp } from "./rateLimit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or nickname", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) return null;

        // IP-based only (not per-identifier) — rate-limiting by the
        // attempted account would let an attacker lock a real user out just
        // by failing their login from anywhere.
        const ip = getClientIp(req);
        const { allowed } = await checkRateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
        if (!allowed) return null;

        // Login accepts either the account email or the public nickname —
        // both are unique columns, so this is unambiguous. Case-insensitive
        // since nobody remembers the exact casing they registered with.
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: credentials.identifier, mode: "insensitive" } },
              { name: { equals: credentials.identifier, mode: "insensitive" } },
            ],
          },
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? "user";
      }
      // Lets the client force a session refresh after changing the nickname
      // or email (see AccountForm / ChangeEmailForm) so the session reflects
      // the change without requiring a re-login.
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      if (trigger === "update" && session?.email) {
        token.email = session.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
