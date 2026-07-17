"use client";

import { useEffect, useState, use } from "react";
import { getEntityMetadata, getVendors, getVendor } from "@/features/vendors/api/vendors.api";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Settings, MoreHorizontal, X, Edit2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function VendorSplitViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const vendorId = resolvedParams.id;
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sortBy') || null;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  const limit = parseInt(searchParams.get('limit') || '50');

  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [metaRes, vendorsRes, vendorRes] = await Promise.all([
          getEntityMetadata('Vendor'),
          getVendors({ page, limit, sortBy: sortBy || undefined, sortOrder }),
          getVendor(vendorId)
        ]);
        setFields(metaRes.fields);
        setVendors(vendorsRes.vendors || vendorsRes);
        setPagination(vendorsRes.pagination || null);
        setSelectedVendor(vendorRes);
      } catch (error) {
        console.error("Failed to load split view data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [vendorId, page, limit, sortBy, sortOrder]);

  const handleBackToTable = () => {
    const queryString = searchParams.toString();
    router.push(`/purchases/vendors${queryString ? `?${queryString}` : ''}`);
  };

  const handleVendorSelect = (id: string) => {
    const queryString = searchParams.toString();
    router.push(`/purchases/vendors/${id}${queryString ? `?${queryString}` : ''}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!selectedVendor) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center flex-col space-y-4">
        <h2 className="text-xl font-semibold text-slate-700">Vendor not found</h2>
        <Button onClick={handleBackToTable} variant="outline">Go back</Button>
      </div>
    );
  }

  // Get unique tabs
  const allTabs = Array.from(new Set(fields.map(f => f.tab || "General")));
  const tabs = allTabs.sort((a, b) => a === 'Basic' ? -1 : b === 'Basic' ? 1 : 0);
  
  // Find name, unique field, price for the sidebar list
  const nameField = fields.find(f => f.name.toLowerCase().includes('name'))?.name || 'name';
  const uniqueFieldMeta = fields.find(f => f.unique);
  const uniqueField = uniqueFieldMeta?.name || 'sku';
  const uniqueFieldLabel = uniqueFieldMeta?.label || 'SKU';
  const priceField = fields.find(f => f.name.toLowerCase().includes('price') || f.name.toLowerCase().includes('rate'))?.name || 'sellingPrice';

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Left Sidebar - Master List */}
      <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0">
          <div className="flex items-center space-x-1 cursor-pointer">
            <span className="font-semibold text-slate-700 text-[15px]">Active Vendors</span>
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/purchases/vendors/new">
              <Button size="icon" variant="ghost" className="w-8 h-8 text-[#0076f2] bg-[#eef5ff] hover:bg-[#dfefff] rounded">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded border border-slate-200 hover:bg-slate-100">
              <MoreHorizontal className="w-4 h-4 text-slate-600" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {vendors.map((vendor) => {
            const isSelected = vendor._id === vendorId;
            return (
              <div 
                key={vendor._id}
                onClick={() => handleVendorSelect(vendor._id)}
                className={`flex items-center justify-between p-3 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors ${isSelected ? 'bg-white border-l-4 border-l-[#0076f2]' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <input type="checkbox" className="rounded border-slate-300 text-[#0076f2]" onClick={(e) => e.stopPropagation()} readOnly />
                  <div className="truncate">
                    <p className={`text-sm truncate ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {vendor.dynamicData[nameField] || 'Unnamed Vendor'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {uniqueFieldLabel}: {vendor.dynamicData[uniqueField] || '-'}
                    </p>
                  </div>
                </div>
                <div className="text-right pl-2">
                  <p className={`text-sm ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    ₹{Number(vendor.dynamicData[priceField] || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Simple pagination indicator for sidebar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="h-10 border-t border-slate-200 flex items-center justify-center bg-white text-xs text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
        )}
      </div>

      {/* Right Content - Detail View */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        {/* Detail Header */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-slate-900">
              {selectedVendor.dynamicData[nameField] || 'Unnamed Vendor'}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push(`/purchases/vendors/${vendorId}/edit`)}
              className="h-8 border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              <Edit2 className="w-3.5 h-3.5 mr-2" />
              Edit
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 h-8 px-3 text-slate-600">
                More <svg className="w-3.5 h-3.5 ml-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-[13px]">
                <DropdownMenuItem className="cursor-pointer">Clone Vendor</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Mark as Inactive</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-red-600">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-px bg-slate-300 mx-1"></div>
            
            <button onClick={handleBackToTable} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 shrink-0 bg-[#fafafa]">
          <div className="flex space-x-8">
            <button 
              onClick={() => setActiveTab('Overview')}
              className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'Overview' ? 'border-[#0076f2] text-[#0076f2]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('Transactions')}
              className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'Transactions' ? 'border-[#0076f2] text-[#0076f2]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Transactions
            </button>
            <button 
              onClick={() => setActiveTab('History')}
              className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'History' ? 'border-[#0076f2] text-[#0076f2]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'Overview' && (
            <div className="max-w-3xl">
              {tabs.map(tab => {
                const tabFields = fields.filter(f => (f.tab || "General") === tab && f.active !== false).sort((a,b) => a.order - b.order);
                if (tabFields.length === 0) return null;

                return (
                  <div key={tab} className="mb-10">
                    <h3 className="text-[15px] font-semibold text-slate-800 mb-4 border-b pb-2">{tab === 'Basic' ? 'Primary Details' : tab}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                      {tabFields.map(field => {
                        let val = selectedVendor.dynamicData[field.name];
                        let displayVal: any = val ?? '-';
                        if (typeof val === 'boolean') {
                          displayVal = val ? 'Yes' : 'No';
                        } else if (val !== null && typeof val === 'object') {
                          // Handle compound fields like primaryContact, phone
                          displayVal = Object.values(val).filter(Boolean).join(' ');
                        }
                        
                        return (
                          <div key={field.name} className="flex">
                            <span className="w-40 text-sm text-slate-500 shrink-0">{field.label}</span>
                            <span className="text-sm text-slate-900 font-medium break-words">{displayVal}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'History' && (
            <div className="max-w-4xl">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVendor.updatedAt && selectedVendor.updatedAt !== selectedVendor.createdAt && (
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {new Date(selectedVendor.updatedAt).toLocaleString('en-IN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-medium">
                          updated by - {selectedVendor.updatedBy || 'system'}
                        </td>
                      </tr>
                    )}
                    {selectedVendor.createdAt && (
                      <tr className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {new Date(selectedVendor.createdAt).toLocaleString('en-IN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-medium">
                          created by - {selectedVendor.createdBy || 'system'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Transactions' && (
            <div className="text-center py-10 text-slate-500">
              No transactions found for this vendor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
