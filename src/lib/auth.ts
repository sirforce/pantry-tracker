import { db } from "@/db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth/next";
import { unstable_noStore } from "next/cache";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const googleId = process.env.GOOGLE_ID;
const googleSecret = process.env.GOOGLE_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL;

if (!googleId || !googleSecret) {
  throw new Error("Missing GOOGLE_ID or GOOGLE_SECRET for Google OAuth");
}

if (!nextAuthSecret) {
  throw new Error("Missing NEXTAUTH_SECRET");
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  secret: nextAuthSecret,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: googleId,
      clientSecret: googleSecret,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        console.log("JWT Callback: Initial sign-in with user", user);
        return {
          ...token,
          id: user.id,
        };
      }

      console.log("JWT Callback: Subsequent token check for email", token.email);
      const dbUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, token.email!),
      });

      if (!dbUser) {
        console.error("JWT Callback: No user found in DB for email", token.email);
        throw new Error("no user with email found");
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    },
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }

      return session;
    },
  },
  debug: true, // Enable NextAuth debugging
};

// NextAuth v4 handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// Auth function using getServerSession
export async function auth() {
  unstable_noStore();
  return await getServerSession(authOptions);
}

// Backward compatibility wrapper that returns { getUser }
export async function authWithGetUser() {
  unstable_noStore();
  const session = await getServerSession(authOptions);
  return {
    getUser: () => session?.user ? { userId: session.user.id } : undefined,
  };
}
