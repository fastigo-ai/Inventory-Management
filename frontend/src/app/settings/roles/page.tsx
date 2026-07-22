"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shield, Check } from 'lucide-react';
import { getRoles, createRole, updateRole, deleteRole } from '@/features/settings/api/roles.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MODULES = [
  'Items',
  'Purchases',
  'Reports',
  'Documents',
  'Store Portal',
  'Settings',
  'roles:manage',
  'users:manage'
];

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await getRoles();
      if (res.success) {
        setRoles(res.data.roles || []);
      }
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', permissions: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (role: any) => {
    setEditingId(role._id);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || []
    });
    setIsModalOpen(true);
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => {
      if (prev.permissions.includes(perm)) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
      }
      return { ...prev, permissions: [...prev.permissions, perm] };
    });
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Role name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateRole(editingId, formData);
        toast.success('Role updated');
      } else {
        await createRole(formData);
        toast.success('Role created');
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await deleteRole(id);
      toast.success('Role deleted');
      fetchRoles();
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" /> Roles & Permissions
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage user roles and their module access levels.</p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Role
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <div key={role._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative group hover:border-indigo-300 transition-colors">
              <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                <button onClick={() => openEditModal(role)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(role._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800">{role.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{role.description || 'No description provided'}</p>
              </div>
              
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Assigned Modules</h4>
                <div className="flex flex-wrap gap-2">
                  {role.permissions?.includes('*') ? (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md border border-purple-200">All Modules (*)</span>
                  ) : role.permissions?.length > 0 ? (
                    role.permissions.map((perm: string) => (
                      <span key={perm} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100">
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No modules assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Role Name</label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Tester, Warehouse Manager"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Module Permissions</label>
              <div className="border border-slate-200 rounded-md overflow-hidden max-h-60 overflow-y-auto">
                {MODULES.map(mod => (
                  <div key={mod} onClick={() => togglePermission(mod)} className="flex items-center px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${formData.permissions.includes(mod) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {formData.permissions.includes(mod) && <Check className="w-3 h-3" />}
                    </div>
                    <span className="text-sm text-slate-700 font-medium">{mod}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? 'Saving...' : 'Save Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
