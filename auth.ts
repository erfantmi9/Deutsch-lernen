import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { signInSchema } from "@/lib/authSchemas";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    // Main option: email + password. Accounts are created by POST /api/register.
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;
        const [user] = await getDb().select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
        if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
    // Second option. No automatic linking to a password account with the same address: sign-up does not verify
    // email, so linking would let whoever registered the address first keep access. Auth.js then redirects to
    // the sign-in page with ?error=OAuthAccountNotLinked, which the login page explains.
    ...(process.env.AUTH_GOOGLE_ID ? [Google] : []),
  ],
  // Passwords (Credentials) only work with JWT sessions in Auth.js.
  session: { strategy: "jwt" },
  pages: { signIn: "/en/login" },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session: ({ session, token }) => ({ ...session, user: { ...session.user, id: token.sub! } }),
  },
}));
