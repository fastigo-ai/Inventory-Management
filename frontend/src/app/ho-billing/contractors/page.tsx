"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Upload } from "lucide-react";
import { getContractors } from "@/features/contractors/api/contractors.api";
import { AssignContractorModal } from "@/features/contractors/components/AssignContractorModal";
import { ContractorImportModal } from "@/features/contractors/components/ContractorImportModal";

export default function ContractorsPage() {
  const router = useRouter();
  
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

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

  const openAssignModal = (contractor: any) => {
    setSelectedContractor(contractor);
    setAssignModalOpen(true);
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Contractors</h1>
            <p className="text-sm text-slate-500 mt-1">Manage all contractors</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              className="bg-white"
              onClick={() => setImportModalOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button 
              className="bg-[#0076f2] hover:bg-blue-600"
              onClick={() => router.push('/ho-billing/contractors/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Contractor
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : contractors.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No contractors found</h3>
              <p className="text-slate-500 mb-6">Create a new contractor to get started.</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setImportModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Contractors
                </Button>
                <Button className="bg-[#0076f2] hover:bg-blue-600" onClick={() => router.push('/ho-billing/contractors/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Contractor
                </Button>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">NAME</th>
                  <th className="px-6 py-3">STATUS</th>
                  <th className="px-6 py-3">PHONE</th>
                  <th className="px-6 py-3">EMAIL</th>
                  <th className="px-6 py-3">ADDRESS</th>
                  <th className="px-6 py-3">ASSIGNED CIRCLES</th>
                  <th className="px-6 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractors.map(c => (
                  <tr 
                    key={c._id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/ho-billing/contractors/${c._id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{c.dynamicData?.displayName || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {c.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{c.dynamicData?.phone?.workPhone || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.dynamicData?.emailAddress || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={c.dynamicData?.contractorAddress?.billing?.city}>
                      {c.dynamicData?.contractorAddress?.billing?.city || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {c.assignedLocations?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.assignedLocations.map((loc: string) => (
                            <span key={loc} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] border border-slate-200">
                              {loc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs bg-white relative z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignModal(c);
                        }}
                      >
                        <MapPin className="w-3.5 h-3.5 mr-1.5" />
                        Assign Circles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AssignContractorModal 
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        contractor={selectedContractor}
        onSuccess={() => {
          fetchContractors(); // Refresh the list
        }}
      />
      
      <ContractorImportModal 
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          fetchContractors();
        }}
      />
    </div>
  );
}
