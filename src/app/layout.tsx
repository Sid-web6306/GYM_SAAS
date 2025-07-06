// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/providers/store-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gym SaaS MVP",
  description: "A comprehensive gym management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
          themes={['light', 'blue', 'green', 'purple', 'rose']}
        >
          <StoreProvider>
            <SessionProvider>
              {children}
            </SessionProvider>
            <Toaster />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}