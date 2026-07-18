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
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50 print:block print:h-auto print:bg-white print:overflow-visible">
          <div className="print:hidden">
            <TopBar />
          </div>
          <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
            <div className="print:hidden h-full flex shrink-0">
              <Sidebar />
            </div>
            <main className="flex-1 overflow-y-auto print:overflow-visible print:block">
              {children}
            </main>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
