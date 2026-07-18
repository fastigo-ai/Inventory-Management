"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getDIs } from "@/features/di/api/di.api";

export default function DIPage() {
  const [dis, setDis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDIs()
      .then(res => setDis(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">DI Registrations</h1>
            <p className="text-sm text-slate-500 mt-1">Manage government inspected Dispatch Instructions</p>
          </div>
          <Link href="/di/new">
            <Button className="bg-[#0076f2] hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New DI Registration
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : dis.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No DIs found</h3>
              <p className="text-slate-500 mb-6">Create a DI registration after a Purchase Order is inspected.</p>
              <Link href="/di/new">
                <Button variant="outline">Create your first DI</Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">DI NUMBER</th>
                  <th className="px-6 py-3">PO NUMBER</th>
                  <th className="px-6 py-3">DATE</th>
                  <th className="px-6 py-3">STATUS</th>
                  <th className="px-6 py-3 text-right">ITEMS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dis.map(di => (
                  <tr key={di._id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-medium text-blue-600">{di.diNumber}</td>
                    <td className="px-6 py-4">{di.purchaseOrderId?.purchaseOrderNumber || '-'}</td>
                    <td className="px-6 py-4">{new Date(di.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        di.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {di.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">{di.lineItems?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
