"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContractor } from "@/features/contractors/api/contractors.api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewContractorPage() {
  const router = useRouter();
  const params = useParams();
  
  const locationParam = Array.isArray(params.location) ? params.location[0] : params.location;
  const location = locationParam ? decodeURIComponent(locationParam) : "";

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Contractor name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createContractor({
        ...formData,
        location
      });
      toast.success('Contractor created successfully');
      router.push(`/ho-billing/contractors/${encodeURIComponent(location)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create contractor');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative min-h-screen">
      {/* Header */}
      <div className="flex-none h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <h1 className="text-xl text-slate-800 font-normal">New Contractor</h1>
        <Link href={`/ho-billing/contractors/${encodeURIComponent(location)}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </Button>
        </Link>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="w-full bg-white p-6 shadow-sm border border-slate-200 rounded-lg max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Contractor Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="name"
                  placeholder="Enter contractor name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input 
                  value={location}
                  disabled
                  className="bg-slate-50 text-slate-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address"
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100 gap-3">
              <Link href={`/ho-billing/contractors/${encodeURIComponent(location)}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="bg-[#0076f2] hover:bg-blue-600" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Contractor'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
