import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // JWT в httpOnly-cookie: сессию можно проверить в proxy без запроса к базе
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Хэш в базе может быть повреждён или заполнен вручную — bcrypt
        // бросает исключение на некорректном формате, гасим его здесь
        let passwordMatches = false;
        try {
          passwordMatches = await bcrypt.compare(password, user.passwordHash);
        } catch {
          passwordMatches = false;
        }
        if (!passwordMatches) return null;

        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" "),
          role: user.role,
        };
      },
    }),
  ],
});
