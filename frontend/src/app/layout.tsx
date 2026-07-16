import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Fastigo ERP",
  description: "Enterprise ERP System",
};

import { ClientLayout } from "@/shared/components/layout/ClientLayout";

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full">
        <ClientLayout>{children}</ClientLayout>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
