import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["217.26.31.135", "127.0.0.1"],
  // Нативные модули нельзя бандлить, только требовать в рантайме:
  // bcrypt — хэширование паролей; @tailwindcss/oxide* — платформенный биндинг
  // Tailwind (Turbopack иначе не резолвит опциональную зависимость oxide)
  serverExternalPackages: [
    "bcrypt",
    "@tailwindcss/oxide",
    "@tailwindcss/oxide-linux-x64-gnu",
  ],
};

export default nextConfig;
