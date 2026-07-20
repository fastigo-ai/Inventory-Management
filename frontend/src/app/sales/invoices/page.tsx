"use client";
import { ModulePlaceholder } from '@/shared/components/layout/ModulePlaceholder';
import { Layers } from 'lucide-react';

export default function InvoicesPage() {
  return (
    <ModulePlaceholder 
      title="Invoices"
      description="This module is currently under development. Stay tuned for exciting updates!"
      icon={<Layers className="w-10 h-10 text-blue-500" />}
    />
  );
}
