import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16: Middleware переименован в Proxy. Здесь работает только
// проверка JWT-сессии — провайдеры (а с ними Prisma и bcrypt) не нужны.
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { nextUrl, auth: session } = request;

  // Неавторизованных отправляем на логин
  if (!session?.user) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  // Сотрудникам (мастерам) запрещён доступ в админ-панель
  if (
    session.user.role === "EMPLOYEE" &&
    (nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/"))
  ) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/admin", "/admin/:path*", "/dashboard", "/dashboard/:path*"],
};
