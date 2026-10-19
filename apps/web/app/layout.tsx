import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Baloo_2 } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/lib/query-provider";
import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import AuthProvider from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/lib/theme";

import Script from "next/script";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const baloo2 = Baloo_2({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#fffbf7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Neha's Institute — Master Cooking & Culinary Arts",
  description:
    "Step-by-step cooking masterclasses, video lectures, and authentic culinary techniques with Neha Ma'am. Watch on phone or computer.",
  keywords: "cooking courses, culinary academy, recipe guides, video masterclasses, cooking academy, Neha's Institute",
  openGraph: {
    title: "Neha's Institute — Master Cooking & Culinary Arts",
    description: "Online cooking masterclasses and authentic recipe guides with Neha Ma'am.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${plusJakarta.variable} ${baloo2.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <link rel="offline" href="/offline.html" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <script
          id="theme-script"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Script
          id="sw-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var swUrl = ${process.env.NEXT_PUBLIC_DISABLE_SW === 'true' || process.env.NODE_ENV === 'development' ? "'/sw-kill.js'" : "'/sw.js'"};
                  navigator.serviceWorker.register(swUrl)
                    .catch(function() { /* SW registration failed */ });
                });
              }
            `,
          }}
        />
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1 page-bottom-clear" style={{ paddingTop: "64px" }}>
                {children}
              </main>
              <BottomNav />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
