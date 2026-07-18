"use client";

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Building, UploadCloud } from 'lucide-react';
import { getBillingCompanies, createBillingCompany, updateBillingCompany, deleteBillingCompany } from '@/features/settings/api/billingCompanies.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function BillingCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await getBillingCompanies();
      if (res.success) {
        setCompanies(res.data);
      }
    } catch (error) {
      toast.error('Failed to load billing companies');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', address: '', phone: '', email: '' });
    setLogoFile(null);
    setLogoPreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (company: any) => {
    setEditingId(company._id);
    setFormData({
      name: company.name,
      address: company.address,
      phone: company.phone || '',
      email: company.email || '',
    });
    setLogoFile(null);
    setLogoPreview(company.logoUrl || null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      toast.error('Name and Address are required');
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('address', formData.address);
      if (formData.phone) submitData.append('phone', formData.phone);
      if (formData.email) submitData.append('email', formData.email);
      if (logoFile) {
        submitData.append('logo', logoFile);
      }

      if (editingId) {
        await updateBillingCompany(editingId, submitData);
        toast.success('Billing company updated');
      } else {
        await createBillingCompany(submitData);
        toast.success('Billing company created');
      }
      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to save billing company');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this billing company?')) return;
    try {
      await deleteBillingCompany(id);
      toast.success('Billing company deleted');
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to delete billing company');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-500" /> Billing Companies
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage multiple billing company profiles for your Purchase Orders.</p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map(company => (
            <div key={company._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative group hover:border-blue-300 transition-colors">
              <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                <button onClick={() => openEditModal(company)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(company._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{company.name}</h3>
                <p className="text-sm text-slate-500 whitespace-pre-wrap">{company.address}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 w-full text-xs text-slate-500 space-y-1 text-left">
                  {company.phone && <p><strong>Phone:</strong> {company.phone}</p>}
                  {company.email && <p><strong>Email:</strong> {company.email}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Billing Company' : 'New Billing Company'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center mb-6">
              <div 
                className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors relative overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500 font-medium">Upload Logo</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Company Name*</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Address*</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors text-sm font-medium">Cancel</button>
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">Save Company</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
