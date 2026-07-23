"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getContractors } from "@/features/contractors/api/contractors.api";

export default function ContractorsPage() {
  const router = useRouter();
  
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContractors = () => {
    setLoading(true);
    getContractors()
      .then(res => setContractors(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Contractors</h1>
            <p className="text-sm text-slate-500 mt-1">Manage all contractors</p>
          </div>
          <Button 
            className="bg-[#0076f2] hover:bg-blue-600"
            onClick={() => router.push('/ho-billing/contractors/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Contractor
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : contractors.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No contractors found</h3>
              <p className="text-slate-500 mb-6">Create a new contractor to get started.</p>
              <Button variant="outline" onClick={() => router.push('/ho-billing/contractors/new')}>
                Add First Contractor
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">NAME</th>
                  <th className="px-6 py-3">PHONE</th>
                  <th className="px-6 py-3">EMAIL</th>
                  <th className="px-6 py-3">DIVISION</th>
                  <th className="px-6 py-3">LOCATION</th>
                  <th className="px-6 py-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractors.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{c.dynamicData?.displayName || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.dynamicData?.phone?.workPhone || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.dynamicData?.emailAddress || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.dynamicData?.contractorAddress?.billing?.division || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.dynamicData?.contractorAddress?.billing?.locationField || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
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
