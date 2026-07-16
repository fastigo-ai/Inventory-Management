"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AuthGuard } from "@/features/auth/components/AuthGuard";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <AuthGuard>
      {isLoginPage ? (
        <main>{children}</main>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
          <TopBar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
