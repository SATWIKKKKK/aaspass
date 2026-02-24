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
  },
  serverExternalPackages: ["razorpay"],
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
