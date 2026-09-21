/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3"],
  // Next 16 blocks /_next/* from “other” hosts in dev (shows as 403/404 in the
  // browser and the search UI never hydrates). Allow local + share.bat tunnels.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
    "*.loca.lt",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
};

module.exports = nextConfig;
