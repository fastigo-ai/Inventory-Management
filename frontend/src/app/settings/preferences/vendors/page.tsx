"use client";
"use client";

import { useEffect, useState } from "react";
import { getEntityMetadata, updateEntityMetadata } from "@/features/vendors/api/vendors.api";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, GripVertical, Search, Lock, Settings } from "lucide-react";
import { FieldBuilderModal } from "@/features/items/components/FieldBuilderModal";
import { ChangeOrderModal } from "@/shared/components/dynamic/ChangeOrderModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function VendorPreferencesPage() {
  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Fields");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    setIsLoading(true);
    try {
      const metaRes = await getEntityMetadata('Vendor');
      setFields(metaRes.fields.sort((a: any,b: any) => a.order - b.order));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveField = async (updatedField: FieldMetadata) => {
    try {
      setIsLoading(true);
      let newFields = [...fields];
      
      const existingIndex = newFields.findIndex(f => f.name === updatedField.name);
      if (existingIndex >= 0) {
        newFields[existingIndex] = updatedField;
      } else {
        newFields.push(updatedField);
      }

      await updateEntityMetadata('Vendor', newFields);
      setFields(newFields);
      setIsModalOpen(false);
      setEditingField(null);
    } catch (error) {
      console.error("Failed to save field", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openNewField = () => {
    setEditingField(null);
    setIsModalOpen(true);
  };

  const openEditField = (field: FieldMetadata) => {
    setEditingField(field);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (field: FieldMetadata) => {
    try {
      setIsLoading(true);
      let newFields = [...fields];
      const index = newFields.findIndex(f => f.name === field.name);
      if (index >= 0) {
        newFields[index] = { ...field, active: field.active === false ? true : false };
        await updateEntityMetadata('Vendor', newFields);
        setFields(newFields);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteField = async (fieldName: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    try {
      setIsLoading(true);
      let newFields = fields.filter(f => f.name !== fieldName);
      await updateEntityMetadata('Vendor', newFields);
      setFields(newFields);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOrder = async (reorderedFields: FieldMetadata[]) => {
    try {
      setIsLoading(true);
      await updateEntityMetadata('Vendor', reorderedFields);
      setFields(reorderedFields);
      setIsOrderModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDataTypeLabel = (type: string) => {
    switch(type) {
      case 'text': return 'Text Box (Single Line)';
      case 'number': return 'Decimal'; // or Number based on precision, we'll map to Decimal for now
      case 'dropdown': return 'Dropdown';
      case 'boolean': return 'Checkbox';
      default: return type;
    }
  };

  const filteredFields = fields.filter(f => f.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedFields = [...filteredFields].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    let aValue: any = a[key as keyof FieldMetadata];
    let bValue: any = b[key as keyof FieldMetadata];

    if (key === 'type') {
      aValue = getDataTypeLabel(a.type);
      bValue = getDataTypeLabel(b.type);
    } else if (key === 'status') {
      aValue = a.active !== false ? 1 : 0;
      bValue = b.active !== false ? 1 : 0;
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading && fields.length === 0) {
    return <div className="flex h-full items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const tabs = ["Preferences", "Fields", "Validation Rules", "Buttons", "Related Lists"];

  return (
    <div className="p-6 max-w-[1400px] mx-auto bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-normal text-slate-800">Vendors</h1>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-500">Custom Fields Usage: {fields.filter(f => !f.visible).length || 3}/59</span>
          <Button variant="outline" onClick={() => setIsOrderModalOpen(true)} className="text-sm h-9 px-4 border-slate-300 text-slate-700 font-normal">
            <GripVertical className="w-4 h-4 mr-1 opacity-50" />
            Change Order
          </Button>
          <Button onClick={openNewField} className="bg-[#0076f2] hover:bg-[#0066d6] text-white text-sm h-9 px-4 font-normal">
            <Plus className="w-4 h-4 mr-1" />
            New Field
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-slate-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === tab ? "text-[#0076f2]" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#0076f2]" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Fields' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Field Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f9f9fb] border-b border-slate-200 text-slate-500 text-xs font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3 uppercase cursor-pointer select-none hover:bg-slate-100 transition-colors group/th" onClick={() => handleSort('label')}>
                    Field Name <span className="inline-block w-3">{sortConfig?.key === 'label' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="px-4 py-3 uppercase cursor-pointer select-none hover:bg-slate-100 transition-colors group/th" onClick={() => handleSort('type')}>
                    Data Type <span className="inline-block w-3">{sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="px-4 py-3 uppercase cursor-pointer select-none hover:bg-slate-100 transition-colors group/th" onClick={() => handleSort('required')}>
                    Mandatory <span className="inline-block w-3">{sortConfig?.key === 'required' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="px-4 py-3 uppercase text-slate-400">Show in all PDFs</th>
                  <th className="px-4 py-3 uppercase cursor-pointer select-none hover:bg-slate-100 transition-colors group/th" onClick={() => handleSort('status')}>
                    Status <span className="inline-block w-3">{sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="px-4 py-3 uppercase w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedFields.map((field, index) => {
                  const isActive = field.active !== false;
                  
                  return (
                    <tr key={field.name} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 flex items-center space-x-2">
                        {field.systemLocked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 text-slate-400 font-bold font-serif shrink-0 text-center leading-none">A</span>
                        )}
                        {field.systemLocked ? (
                          <span onClick={() => isActive && openEditField(field)} className={`border-b border-dotted border-slate-400 cursor-pointer ${!isActive ? 'text-slate-500 cursor-not-allowed border-none' : 'text-slate-800'}`}>
                            {field.label}
                          </span>
                        ) : (
                          <span onClick={() => isActive && openEditField(field)} className={`${isActive ? "text-[#0076f2] cursor-pointer hover:underline" : "text-slate-500 cursor-not-allowed"}`}>
                            {field.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{getDataTypeLabel(field.type)}</td>
                      <td className="px-4 py-3 text-slate-700">{field.required ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-slate-700">No</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${isActive ? 'text-[#2ca01c]' : 'text-slate-400'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none">
                            <Settings className="w-4 h-4 text-slate-500" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-[13px] text-slate-700">
                            {isActive && (
                              <DropdownMenuItem onClick={() => openEditField(field)} className="cursor-pointer text-[#0076f2] focus:text-[#0076f2] focus:bg-slate-50">
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleToggleActive(field)} className="cursor-pointer">
                              {isActive ? 'Mark as Inactive' : 'Mark as Active'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              View Associated Components
                            </DropdownMenuItem>
                            {!field.systemLocked && (
                              <DropdownMenuItem onClick={() => handleDeleteField(field.name)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                Delete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer">
                              Configure Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {sortedFields.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500">No fields found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab !== 'Fields' && (
        <div className="py-12 text-center text-slate-500">
          This section is currently under development.
        </div>
      )}

      {isModalOpen && (
        <FieldBuilderModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveField}
          initialData={editingField}
          allFields={fields}
        />
      )}

      <ChangeOrderModal 
        isOpen={isOrderModalOpen} 
        onClose={() => setIsOrderModalOpen(false)} 
        fields={fields} 
        onSave={handleSaveOrder} 
      />
    </div>
  );
}
