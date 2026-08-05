import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["217.26.31.135"],
  // bcrypt — нативный модуль, его нельзя бандлить, только требовать в рантайме
  serverExternalPackages: ["bcrypt"],
};

export default nextConfig;
