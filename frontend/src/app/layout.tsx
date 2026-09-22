import type { Metadata } from "next";
import { Manrope, Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const sans = Manrope({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookingPro | Quản lý Đặt lịch Dịch vụ Cao cấp",
  description: "Hệ thống Quản lý Đặt lịch Dịch vụ Chuyên nghiệp & Tiên tiến",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f5f4f2] text-[#0a0a0a] antialiased selection:bg-[#ff6b00]/20 selection:text-[#0a0a0a]">
        {/* Subtle Ambient Radial Glow */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[450px] bg-gradient-to-b from-[#ff6b00]/[0.04] via-[#ff6b00]/[0.01] to-transparent rounded-full blur-3xl" />
        </div>

        <Navbar />
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
