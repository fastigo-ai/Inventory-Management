"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { cn } from "@/lib/utils";

import { useUIStore } from "@/shared/store/ui.store";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  // Close sidebar on navigation in mobile
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  return (
    <AuthGuard>
      {isLoginPage ? (
        <main>{children}</main>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50 print:block print:h-auto print:bg-white print:overflow-visible">
          <div className="print:hidden z-30">
            <TopBar />
          </div>
          <div className="flex flex-1 overflow-hidden print:block print:overflow-visible relative">
            
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
              <div 
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}

            <div className={cn(
              "print:hidden h-full shrink-0 z-50 transition-transform duration-300 ease-in-out absolute md:relative",
              isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
              <Sidebar />
            </div>

            <main className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible print:block">
              {children}
            </main>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
