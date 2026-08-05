import type { NextAuthConfig } from "next-auth";

/** Разделы, доступные только авторизованным пользователям */
export const PROTECTED_PREFIXES = ["/admin", "/dashboard"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Базовая конфигурация Auth.js без провайдеров.
 *
 * Вынесена отдельно, чтобы `proxy.ts` мог проверять сессию, не подтягивая
 * в свой бандл Prisma и нативный bcrypt — они нужны только на этапе логина.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Вызывается из proxy: false → редирект на страницу логина
    authorized({ request, auth }) {
      if (!isProtectedPath(request.nextUrl.pathname)) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.role) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
