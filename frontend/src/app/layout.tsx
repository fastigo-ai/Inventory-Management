import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fastigo ERP",
  description: "Enterprise ERP System",
};

import { ClientLayout } from "@/shared/components/layout/ClientLayout";

import NextTopLoader from 'nextjs-toploader';
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="font-sans h-full antialiased"
    >
      <body className="min-h-full">
        <NextTopLoader color="#2563eb" showSpinner={false} />
        <ClientLayout>{children}</ClientLayout>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
