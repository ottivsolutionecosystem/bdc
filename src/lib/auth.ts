import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.active = user.active;
        return token;
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, active: true },
        });
        if (!dbUser) {
          token.active = false;
          return token;
        }
        token.role = dbUser.role;
        token.active = dbUser.active;
      }

      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.active = token.active;
      return session;
    },
  },
});
