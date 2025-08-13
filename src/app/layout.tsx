// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { RazorpayProvider } from "@/components/providers/razorpay-provider";
import { PWAWrapper } from "@/components/pwa/PWAWrapper";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  title: "Gym SaaS MVP",
  description: "A comprehensive gym management system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GymSaaS",
  },
  icons: [
    { rel: "icon", url: "/icon.svg" },
    { rel: "apple-touch-icon", url: "/icon-192x192.png" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={inter.className}>
      <Script src = "https://checkout.razorpay.com/v1/checkout.js"></Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="rose"
          enableSystem={false}
          disableTransitionOnChange={false}
          themes={['light', 'blue', 'green', 'purple', 'rose']}
        >
          <RazorpayProvider>
            <QueryProvider>
              <SessionProvider>
                {children}
                <PWAWrapper />
              </SessionProvider>
              <Toaster />
            </QueryProvider>
          </RazorpayProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}