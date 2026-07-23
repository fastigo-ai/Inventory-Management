"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { getContractors } from "@/features/contractors/api/contractors.api";
import { CreateContractorModal } from "@/features/contractors/components/CreateContractorModal";

const VALID_LOCATIONS = ["Solan", "Nahan", "Rampur", "Rohru"];

export default function LocationContractorsPage() {
  const params = useParams();
  const router = useRouter();
  
  // URL parameter can be an array in Next.js, so we safely get the string value
  const locationParam = Array.isArray(params.location) ? params.location[0] : params.location;
  const location = locationParam ? decodeURIComponent(locationParam) : "";
  
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchContractors = () => {
    setLoading(true);
    getContractors(location)
      .then(res => setContractors(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (location && VALID_LOCATIONS.includes(location)) {
      fetchContractors();
    } else {
      router.push('/ho-billing/contractors');
    }
  }, [location, router]);

  if (!VALID_LOCATIONS.includes(location)) {
    return null; // Will redirect
  }

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => router.push('/ho-billing/contractors')}
              className="w-10 h-10 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Contractors - {location}</h1>
              <p className="text-sm text-slate-500 mt-1">Manage contractors associated with {location}</p>
            </div>
          </div>
          <Button 
            className="bg-[#0076f2] hover:bg-blue-600"
            onClick={() => router.push(`/ho-billing/contractors/${encodeURIComponent(location)}/new`)}
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
              <p className="text-slate-500 mb-6">Create a new contractor for {location} to get started.</p>
              <Button variant="outline" onClick={() => router.push(`/ho-billing/contractors/${encodeURIComponent(location)}/new`)}>
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
                  <th className="px-6 py-3">ADDRESS</th>
                  <th className="px-6 py-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractors.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{c.dynamicData?.displayName || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.dynamicData?.phone?.workPhone || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.dynamicData?.emailAddress || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={c.dynamicData?.vendorAddresses?.billingAddress?.city}>
                      {c.dynamicData?.vendorAddresses?.billingAddress?.city || '-'}
                    </td>
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
