"use client";

import { useEffect, useState, use } from "react";
import { getContractors, getContractor, updateContractor, deleteContractor, getAssignments } from "@/features/contractors/api/contractors.api";
import { getEntityMetadata } from "@/features/vendors/api/vendors.api";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, MoreHorizontal, X, Edit2, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ContractorSplitViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const contractorId = resolvedParams.id;
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [metaRes, contractorsRes, contractorRes] = await Promise.all([
          getEntityMetadata('Contractor'),
          getContractors(),
          getContractor(contractorId)
        ]);
        setFields(metaRes.fields);
        setContractors(contractorsRes.data || contractorsRes);
        setSelectedContractor(contractorRes.data || contractorRes);
      } catch (error) {
        console.error("Failed to load split view data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [contractorId]);

  useEffect(() => {
    if (activeTab === 'Transactions' && selectedContractor) {
      const fetchTransactions = async () => {
        setIsLoadingAssignments(true);
        try {
          const assignmentsData = await getAssignments(contractorId);
          setAssignments(assignmentsData.data || []);
        } catch (error) {
          console.error("Failed to load assignments", error);
        } finally {
          setIsLoadingAssignments(false);
        }
      };
      fetchTransactions();
    }
  }, [activeTab, selectedContractor, contractorId]);

  const handleBackToTable = () => {
    router.push('/ho-billing/contractors');
  };

  const handleContractorSelect = (id: string) => {
    router.push(`/ho-billing/contractors/${id}`);
  };

  const handleToggleStatus = async () => {
    try {
      const currentStatus = selectedContractor?.isActive !== false ? 'Active' : 'Inactive';
      const newIsActive = currentStatus === 'Active' ? false : true;
      
      await updateContractor(contractorId, { isActive: newIsActive });
      
      setSelectedContractor({ ...selectedContractor, isActive: newIsActive });
      setContractors(contractors.map(c => c._id === contractorId ? { ...c, isActive: newIsActive } : c));
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this contractor?")) {
      try {
        await deleteContractor(contractorId);
        handleBackToTable();
      } catch (err) {
        console.error("Failed to delete contractor", err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!selectedContractor) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center flex-col space-y-4">
        <h2 className="text-xl font-semibold text-slate-700">Contractor not found</h2>
        <Button onClick={handleBackToTable} variant="outline">Go back</Button>
      </div>
    );
  }

  // Get unique tabs
  const allTabs = Array.from(new Set(fields.map(f => f.tab || "General")));
  const tabs = allTabs.sort((a, b) => a === 'Basic' ? -1 : b === 'Basic' ? 1 : 0);
  
  const nameField = fields.find(f => f.name.toLowerCase().includes('name'))?.name || 'displayName';
  
  // Custom parsing for assignments
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Left Sidebar - Master List */}
      <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0">
          <div className="flex items-center space-x-1 cursor-pointer">
            <span className="font-semibold text-slate-700 text-[15px]">Active Contractors</span>
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/ho-billing/contractors/new">
              <Button size="icon" variant="ghost" className="w-8 h-8 text-[#0076f2] bg-[#eef5ff] hover:bg-[#dfefff] rounded">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contractors.map((contractor) => {
            const isSelected = contractor._id === contractorId;
            return (
              <div 
                key={contractor._id}
                onClick={() => handleContractorSelect(contractor._id)}
                className={`flex items-center justify-between p-3 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors ${isSelected ? 'bg-white border-l-4 border-l-[#0076f2]' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <input type="checkbox" className="rounded border-slate-300 text-[#0076f2]" onClick={(e) => e.stopPropagation()} readOnly />
                  <div className="truncate">
                    <p className={`text-sm truncate ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {contractor.dynamicData?.[nameField] || 'Unnamed Contractor'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {contractor.dynamicData?.phone?.workPhone || 'No Phone'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content - Detail View */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        {/* Detail Header */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-slate-900">
              {selectedContractor.dynamicData?.[nameField] || 'Unnamed Contractor'}
            </h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedContractor.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {selectedContractor.isActive !== false ? 'Active' : 'Inactive'}
            </span>
            {selectedContractor.assignedLocations?.length > 0 && (
              <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded text-xs text-slate-600 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedContractor.assignedLocations.join(', ')}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 h-8 px-3 text-slate-600">
                More <svg className="w-3.5 h-3.5 ml-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-[13px]">
                <DropdownMenuItem className="cursor-pointer" onClick={handleToggleStatus}>
                  {selectedContractor?.isActive !== false ? 'Mark as Inactive' : 'Mark as Active'}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleDelete}>Delete</DropdownMenuItem>
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
              Assignments
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
                        let val = selectedContractor.dynamicData?.[field.name];
                        let displayVal: any = val ?? '-';
                        if (typeof val === 'boolean') {
                          displayVal = val ? 'Yes' : 'No';
                        } else if (val !== null && typeof val === 'object') {
                          if (field.name === 'phone' || field.name === 'contactPersonPhone') {
                            const phoneParts = [];
                            if (val.workPhone) phoneParts.push(val.workPhone);
                            if (val.mobile) phoneParts.push(val.mobile);
                            displayVal = phoneParts.join(', ');
                          } else if (field.name === 'contractorAddress' && val) {
                            const addresses = [];
                            const formatAddress = (addr: any) => [addr.street1, addr.street2, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ');
                            if (val.billing) addresses.push("Billing: " + formatAddress(val.billing));
                            displayVal = addresses.filter(Boolean).join(' | ');
                          } else if (field.name === 'bankDetails' && val) {
                            let banks = Array.isArray(val) ? val : Object.values(val);
                            displayVal = banks.map((bk: any) => typeof bk === 'object' ? [bk.accountName, bk.accountNumber, bk.bankName].filter(Boolean).join(' ') : '').filter(Boolean).join(', ');
                          } else if (Array.isArray(val)) {
                            displayVal = val.map(v => typeof v === 'object' && v !== null ? Object.values(v).filter(Boolean).join(' ') : v).join(', ');
                          } else {
                            displayVal = Object.values(val).filter(Boolean).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v).join(' ');
                          }
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

          {activeTab === 'Transactions' && (
            <div className="max-w-5xl space-y-8">
              {isLoadingAssignments ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b pb-2">Contractor Assignments</h3>
                    {assignments.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3 font-medium">Date</th>
                              <th className="px-6 py-3 font-medium">Assignment #</th>
                              <th className="px-6 py-3 font-medium">Circle/Package</th>
                              <th className="px-6 py-3 font-medium text-right">Items Assigned</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignments.map((assignment: any) => (
                              <tr key={assignment._id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                                  {new Date(assignment.date || assignment.createdAt).toLocaleDateString('en-IN')}
                                </td>
                                <td className="px-6 py-3 font-medium text-slate-900">
                                  {assignment.assignmentNumber}
                                </td>
                                <td className="px-6 py-3 text-slate-600">
                                  {assignment.circle} / {assignment.package}
                                </td>
                                <td className="px-6 py-3 text-right text-slate-900 font-medium">
                                  {assignment.lineItems?.length || 0} items
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 py-4 text-center border rounded-lg bg-slate-50 border-dashed">No Assignments found for this contractor.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
