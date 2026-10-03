import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { LiveProvider } from "@/lib/live";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Üretim Takip",
  description: "İş emri, rota, istasyon ve maliyet takibi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <LiveProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Nav />
            <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
          </div>
        </LiveProvider>
      </body>
    </html>
  );
}
