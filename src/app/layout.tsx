// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react"; // <-- Import Suspense from React
import { PageLoader } from "@/components/layout/PageLoader"; // <-- Import our loader

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gym SaaS MVP",
  description: "Manage your gym with ease",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 
          By placing Suspense here, we wrap the entire application.
          Any page that needs to "bail out" of static rendering
          will trigger this fallback, showing a full-page loader.
        */}
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
};

export default RootLayout;