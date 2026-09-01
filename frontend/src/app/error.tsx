"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error("Global UI Error Caught by ErrorBoundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Something went wrong!</h2>
          <p className="text-slate-500 mt-2 text-sm">
            We encountered an unexpected error while rendering this page. The issue has been logged.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left overflow-hidden">
          <p className="text-xs font-mono text-slate-600 break-words line-clamp-3">
            {error.message || "Unknown error occurred"}
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
