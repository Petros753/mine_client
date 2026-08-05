import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16: Middleware переименован в Proxy. Здесь работает только
// проверка JWT-сессии — провайдеры (а с ними Prisma и bcrypt) не нужны.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/admin", "/admin/:path*", "/dashboard", "/dashboard/:path*"],
};
