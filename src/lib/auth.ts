import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// NextAuth v5 설정 — 단일 어드민 계정 인증
const config: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Admin",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
          throw new Error("ADMIN_EMAIL/ADMIN_PASSWORD 환경변수 미설정");
        }

        if (
          credentials?.email === adminEmail &&
          credentials?.password === adminPassword
        ) {
          return { id: "admin", name: "Admin", email: adminEmail };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
      const isLoginPage = request.nextUrl.pathname === "/admin/login";
      const isLoggedIn = !!auth?.user;

      if (isLoginPage) return true;
      if (isAdminRoute && !isLoggedIn) return false;
      return true;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
