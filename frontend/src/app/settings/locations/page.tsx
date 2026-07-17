"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, MapPin, X, Building, LayoutGrid } from 'lucide-react';
import { getLocations, createLocation, updateLocation, deleteLocation } from '@/features/settings/api/locations.api';
import { toast } from 'sonner';

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    parentLocation: '',
    type: 'Warehouse',
    address: '',
    contactPerson: '',
    phone: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const res = await getLocations();
      if (res.success) {
        setLocations(res.data);
      }
    } catch (err) {
      toast.error('Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingLocationId(null);
    setFormData({
      name: '',
      parentLocation: '',
      type: 'Warehouse',
      address: '',
      contactPerson: '',
      phone: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (loc: any) => {
    setEditingLocationId(loc._id);
    setFormData({
      name: loc.name,
      parentLocation: loc.parentLocation?._id || '',
      type: loc.type || 'Warehouse',
      address: loc.address || '',
      contactPerson: loc.contactPerson || '',
      phone: loc.phone || '',
      status: loc.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.parentLocation) {
        delete (payload as any).parentLocation;
      }
      
      if (editingLocationId) {
        await updateLocation(editingLocationId, payload);
        toast.success('Location updated successfully');
      } else {
        await createLocation(payload);
        toast.success('Location created successfully');
      }
      setIsModalOpen(false);
      fetchLocations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save location');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      try {
        await deleteLocation(id);
        toast.success('Location deleted successfully');
        fetchLocations();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to delete location');
      }
    }
  };

  // Group locations hierarchically
  const buildHierarchy = () => {
    const filteredLocations = locations.filter(loc => loc.type !== 'Other');
    const parentLocations = filteredLocations.filter(loc => !loc.parentLocation);
    const childLocations = filteredLocations.filter(loc => loc.parentLocation);
    
    return parentLocations.map(parent => {
      const children = childLocations.filter(child => child.parentLocation._id === parent._id);
      return { ...parent, children };
    });
  };

  const hierarchicalLocations = buildHierarchy();

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-500" /> Locations
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your warehouses, stores, and head office hierarchy.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 px-4 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-6xl mx-auto w-full">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center p-16 bg-white border border-slate-200 rounded-xl">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700">No Locations Found</h2>
            <p className="text-slate-500 mt-2 mb-6">Create your first location to start tracking inventory across multiple sites.</p>
            <button onClick={openAddModal} className="text-blue-500 hover:underline font-medium">Create a Location</button>
          </div>
        ) : (
          <div className="space-y-6">
            {hierarchicalLocations.map(parent => (
              <div key={parent._id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Parent Row */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{parent.name}</h3>
                      <p className="text-xs font-medium text-slate-500">{parent.type} • {parent.address || 'No Address'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${parent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                      {parent.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(parent)} className="p-2 text-slate-400 hover:text-blue-600 bg-white rounded shadow-sm border border-slate-200">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(parent._id)} className="p-2 text-slate-400 hover:text-red-600 bg-white rounded shadow-sm border border-slate-200">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Children Rows */}
                {parent.children.length > 0 && (
                  <div className="divide-y divide-slate-100">
                    {parent.children.map((child: any) => (
                      <div key={child._id} className="px-6 py-3 pl-16 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{child.name}</p>
                            <p className="text-xs text-slate-500">{child.type}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${child.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                            {child.status}
                          </span>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(child)} className="p-1.5 text-slate-400 hover:text-blue-600">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(child._id)} className="p-1.5 text-slate-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{editingLocationId ? 'Edit Location' : 'Add New Location'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Location Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. West Coast Warehouse" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                    <option value="Head Office">Head Office</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Store">Store</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Parent Location (Optional)</label>
                  <select value={formData.parentLocation} onChange={e => setFormData({...formData, parentLocation: e.target.value})} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">None (Top-level Location)</option>
                    {locations.filter(l => l._id !== editingLocationId && !l.parentLocation).map(loc => (
                      <option key={loc._id} value={loc._id}>{loc.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Select a parent location to nest this location under it.</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Full address..." />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Location</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
