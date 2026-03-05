import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**" }, // allow any HTTPS image
    ],
    minimumCacheTTL: 60,
  },
  serverExternalPackages: ["razorpay"],
  typescript: { ignoreBuildErrors: false },
  // Turbopack is used for dev (next dev) — see package.json scripts
  // Tree-shake large packages so only used icons/components are bundled
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-icons",
      "date-fns",
    ],
  },
};

export default nextConfig;
