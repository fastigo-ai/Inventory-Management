import React from 'react';
import Link from 'next/link';
import { Hammer, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function ModulePlaceholder({ title, description, icon }: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80vh] px-4 text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100">
        {icon || <Hammer className="w-10 h-10 text-blue-500" />}
      </div>
      
      <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-3">
        {title}
      </h1>
      
      <p className="text-slate-500 max-w-md text-lg mb-8 leading-relaxed">
        {description}
      </p>

      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 max-w-lg border border-blue-100 shadow-sm relative overflow-hidden mb-8">
        <div className="absolute -top-4 -right-4 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 transform rotate-12">
          <Sparkles className="w-3 h-3" /> Coming Soon
        </div>
        <h3 className="font-semibold text-slate-800 mb-2">What to expect here:</h3>
        <ul className="text-sm text-slate-600 space-y-2 text-left list-disc pl-5">
          <li>Full CRUD (Create, Read, Update, Delete) capabilities.</li>
          <li>Real-time synchronization with your central inventory database.</li>
          <li>Export, Import, and Advanced Filtering options.</li>
        </ul>
      </div>

      <Link href="/">
        <Button variant="outline" className="flex items-center gap-2 px-6 py-5 rounded-full hover:bg-slate-50 transition-colors text-slate-700 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
