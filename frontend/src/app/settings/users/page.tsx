"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '@/features/settings/api/users.api';
import { getRoles } from '@/features/settings/api/roles.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: '',
    assignedPackage: '',
    assignedCircle: ''
  });

  const [editFormData, setEditFormData] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: '',
    assignedPackage: '',
    assignedCircle: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        getUsers(),
        getRoles()
      ]);
      if (usersRes.success) setUsers(usersRes.data.users || []);
      if (rolesRes.success) setRoles(rolesRes.data.roles || []);
    } catch (error) {
      toast.error('Failed to load users or roles');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ 
      firstName: '', 
      lastName: '', 
      email: '', 
      password: '', 
      roleId: roles[0]?._id || '', 
      assignedPackage: '', 
      assignedCircle: '' 
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditFormData({
      id: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '', // blank by default unless they want to change password
      roleId: user.role?._id || roles[0]?._id || '',
      assignedPackage: user.assignedPackage || '',
      assignedCircle: user.assignedCircle || ''
    });
    setIsEditModalOpen(true);
  };

  const handleCreateUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.roleId) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const payload = {
      ...formData,
      role: formData.roleId
    };

    setIsSubmitting(true);
    try {
      await createUser(payload);
      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editFormData.firstName || !editFormData.lastName || !editFormData.email || !editFormData.roleId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      firstName: editFormData.firstName,
      lastName: editFormData.lastName,
      email: editFormData.email,
      roleId: editFormData.roleId,
      assignedPackage: editFormData.assignedPackage,
      assignedCircle: editFormData.assignedCircle,
      ...(editFormData.password ? { password: editFormData.password } : {})
    };

    setIsSubmitting(true);
    try {
      await updateUser(editFormData.id, payload);
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (user: any) => {
    setUserToDeleteId(user._id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDeleteId) return;

    setIsSubmitting(true);
    try {
      await deleteUser(userToDeleteId);
      toast.success('User deleted successfully');
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
      setUserToDeleteId(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" /> User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage system users, testers, assign roles, edit details and delete accounts.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Location/Package</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{user.firstName} {user.lastName}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        {user.role?.name || 'No Role'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {user.assignedCircle ? `${user.assignedCircle} / ` : ''}
                      {user.assignedPackage || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded transition-colors inline-flex items-center gap-1"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Edit</span>
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="text-rose-600 hover:text-rose-800 p-1.5 hover:bg-rose-50 rounded transition-colors inline-flex items-center gap-1"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">First Name</label>
                <Input
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Assign Role</label>
              <select
                className="w-full h-10 rounded-md border border-slate-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={formData.roleId}
                onChange={e => setFormData({ ...formData, roleId: e.target.value })}
              >
                {roles.map(role => (
                  <option key={role._id} value={role._id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Package (Optional)</label>
                <select
                  className="w-full h-10 rounded-md border border-slate-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={formData.assignedPackage}
                  onChange={e => setFormData({ ...formData, assignedPackage: e.target.value })}
                >
                  <option value="">Select Package</option>
                  <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                  <option value="Package 2 (R/R)">Package 2 (R/R)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Circle (Optional)</label>
                <select
                  className="w-full h-10 rounded-md border border-slate-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={formData.assignedCircle}
                  onChange={e => setFormData({ ...formData, assignedCircle: e.target.value })}
                >
                  <option value="">Select Circle</option>
                  <option value="Solan">Solan</option>
                  <option value="Nahan">Nahan</option>
                  <option value="Rampur">Rampur</option>
                  <option value="Rohru">Rohru</option>
                  <option value="Shimla">Shimla</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">First Name</label>
                <Input
                  value={editFormData.firstName}
                  onChange={e => setEditFormData({ ...editFormData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Last Name</label>
                <Input
                  value={editFormData.lastName}
                  onChange={e => setEditFormData({ ...editFormData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Password (Leave blank to keep current)</label>
              <Input
                type="password"
                placeholder="New password"
                value={editFormData.password}
                onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Assign Role</label>
              <select
                className="w-full h-10 rounded-md border border-slate-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={editFormData.roleId}
                onChange={e => setEditFormData({ ...editFormData, roleId: e.target.value })}
              >
                {roles.map(role => (
                  <option key={role._id} value={role._id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Package (Optional)</label>
                <select
                  className="w-full h-10 rounded-md border border-slate-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={editFormData.assignedPackage}
                  onChange={e => setEditFormData({ ...editFormData, assignedPackage: e.target.value })}
                >
                  <option value="">Select Package</option>
                  <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                  <option value="Package 2 (R/R)">Package 2 (R/R)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Circle (Optional)</label>
                <select
                  className="w-full h-10 rounded-md border border-slate-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={editFormData.assignedCircle}
                  onChange={e => setEditFormData({ ...editFormData, assignedCircle: e.target.value })}
                >
                  <option value="">Select Circle</option>
                  <option value="SOLAN">SOLAN</option>
                  <option value="NAHAN">NAHAN</option>
                  <option value="RAMPUR">RAMPUR</option>
                  <option value="ROHRU">ROHRU</option>
                  <option value="SHIMLA">SHIMLA</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Delete User Account</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this user? This action cannot be undone and will revoke all access immediately.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleDeleteUser} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
