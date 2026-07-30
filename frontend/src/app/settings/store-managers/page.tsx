"use client";

import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser, getRoles } from "@/features/users/api/users.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const PACKAGES = ["Package 1 (S/N)", "Package 2 (R/R)"];
const CIRCLES = ["Solan", "Nahan", "Rohru", "Rampur", "Kumarhatti", "Nalagarh"];

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  assignedPackage: PACKAGES[0],
  assignedCircle: CIRCLES[0],
};

export default function StoreManagersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const fetchData = async () => {
    try {
      const usersRes = await getUsers();
      const rolesRes = await getRoles();
      const storeManagerRole = rolesRes.data.roles.find((r: any) => r.name === "Store Manager");
      setRoles(rolesRes.data.roles);
      if (storeManagerRole) {
        setUsers(usersRes.data.users.filter((u: any) => u.role?._id === storeManagerRole._id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      assignedPackage: user.assignedPackage || PACKAGES[0],
      assignedCircle: user.assignedCircle || CIRCLES[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const storeManagerRole = roles.find((r: any) => r.name === "Store Manager");
    if (!storeManagerRole) {
      toast.error("Store Manager role not found in system!");
      return;
    }

    try {
      if (editingUser) {
        const payload: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          assignedPackage: formData.assignedPackage,
          assignedCircle: formData.assignedCircle,
          roleId: storeManagerRole._id,
        };
        if (formData.password) payload.password = formData.password;
        await updateUser(editingUser._id, payload);
        toast.success("Store Manager updated successfully");
      } else {
        await createUser({ ...formData, roleId: storeManagerRole._id });
        toast.success("Store Manager created successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save store manager");
    }
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) return;
    try {
      await deleteUser(user._id);
      toast.success("Store Manager deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete store manager");
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Store Managers</h1>
            <p className="text-sm text-slate-500 mt-1">Manage portal access for specific packages and circles</p>
          </div>
          <Button onClick={openAddModal} className="bg-[#0076f2] hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            New Store Manager
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Store Managers found</h3>
              <p className="text-slate-500 mb-6">Create an account for a Store Manager to give them access.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">NAME</th>
                  <th className="px-6 py-3">EMAIL</th>
                  <th className="px-6 py-3">PACKAGE</th>
                  <th className="px-6 py-3">CIRCLE</th>
                  <th className="px-6 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.firstName} {u.lastName}</td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">{u.assignedPackage || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-semibold">{u.assignedCircle || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingUser ? "Edit Store Manager" : "Create Store Manager"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">First Name</label>
                  <Input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Last Name</label>
                  <Input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
                <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Password {editingUser && <span className="text-slate-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <Input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder={editingUser ? "••••••••" : ""}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Assigned Package</label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
                    value={formData.assignedPackage}
                    onChange={e => setFormData({...formData, assignedPackage: e.target.value})}
                  >
                    {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Assigned Circle</label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
                    value={formData.assignedCircle}
                    onChange={e => setFormData({...formData, assignedCircle: e.target.value})}
                  >
                    {CIRCLES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#0076f2] hover:bg-blue-600 text-white">
                  {editingUser ? "Save Changes" : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
