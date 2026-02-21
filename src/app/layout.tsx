import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AasPass - Get All Services to Feel Like Home",
  description: "Book hostels, PGs, libraries, coaching centers and more. AasPass is your one-stop platform for student accommodation and services across India.",
  keywords: ["hostel booking", "PG accommodation", "student services", "coaching", "library", "AasPass"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
