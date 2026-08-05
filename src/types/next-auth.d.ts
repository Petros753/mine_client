import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

// `next-auth/jwt` целиком реэкспортирует `@auth/core/jwt`, поэтому расширять
// нужно исходный модуль — иначе аугментация не попадает в интерфейс JWT.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
  }
}
