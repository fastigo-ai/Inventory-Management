"use client";

import { useState } from "react";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FieldBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: FieldMetadata) => void;
  initialData?: FieldMetadata | null;
}

export function FieldBuilderModal({ isOpen, onClose, onSave, initialData }: FieldBuilderModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [label, setLabel] = useState(initialData?.label || "");
  const [type, setType] = useState(initialData?.type || "text");
  const [required, setRequired] = useState(initialData?.required || false);
  const [unique, setUnique] = useState(initialData?.unique || false);
  const [visible, setVisible] = useState(initialData?.visible ?? true);
  const [tab, setTab] = useState(initialData?.tab || "General");
  const [options, setOptions] = useState<string[]>(initialData?.options || []);
  const [newOption, setNewOption] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    if (!initialData) {
      const generatedName = newLabel.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
      setName(generatedName.replace(/[^a-zA-Z0-9]/g, ''));
    }
  };

  const addOption = () => {
    if (newOption && !options.includes(newOption)) {
      setOptions([...options, newOption]);
      setNewOption("");
    }
  };

  const removeOption = (opt: string) => {
    setOptions(options.filter(o => o !== opt));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !label) return;

    onSave({
      name,
      label,
      type,
      required,
      unique,
      visible,
      editable: initialData?.editable ?? true,
      tab,
      order: initialData?.order ?? 99,
      options: type === 'dropdown' ? options : undefined
    });
  };

  const dataTypes = [
    { value: 'text', label: 'Text Box (Single Line)' },
    { value: 'text_multi', label: 'Text Box (Multi Line)' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'phone', label: 'Phone' },
    { value: 'number', label: 'Number' },
    { value: 'decimal', label: 'Decimal' },
    { value: 'amount', label: 'Amount' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'boolean', label: 'Checkbox' },
  ];

  const getDataTypeLabel = (val: string) => dataTypes.find(d => d.value === val)?.label || val;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[700px] p-0 border-none shadow-xl rounded-md bg-white overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-[#f9f9fb]">
          <DialogTitle className="text-lg font-normal text-slate-800">
            {initialData ? "Edit Field - Items" : "New Field - Items"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-6 py-6 h-full flex flex-col">
          <div className="space-y-6 flex-1">
            
            {/* Label Row */}
            <div className="flex items-center">
              <div className="w-1/3">
                <label className="text-[13px] text-[#d32f2f] font-normal">Label Name*</label>
              </div>
              <div className="w-2/3 max-w-sm">
                <input 
                  type="text" 
                  value={label} 
                  onChange={handleLabelChange} 
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                  required 
                />
              </div>
            </div>

            {/* Internal Name Row (Hidden by default in Zoho usually, but keeping it for our engine) */}
            <div className="flex items-center">
              <div className="w-1/3">
                <label className="text-[13px] text-slate-700 font-normal">API Key</label>
              </div>
              <div className="w-2/3 max-w-sm">
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  disabled={!!initialData}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm disabled:bg-slate-50"
                  required 
                />
              </div>
            </div>

            {/* Data Type Row */}
            <div className="flex items-start">
              <div className="w-1/3 mt-1.5">
                <label className="text-[13px] text-[#d32f2f] font-normal">Data Type*</label>
              </div>
              <div className="w-2/3 max-w-sm relative z-50">
                <div 
                  className={`w-full px-3 py-1.5 border rounded focus:outline-none text-sm flex justify-between items-center ${
                    initialData ? 'border-slate-300 text-slate-500 bg-slate-50 cursor-not-allowed' : 'border-[#408dfb] text-[#0076f2] bg-white cursor-pointer'
                  }`}
                  onClick={() => !initialData && setShowTypeDropdown(!showTypeDropdown)}
                >
                  <span>{getDataTypeLabel(type)}</span>
                  <svg className={`w-4 h-4 ${initialData ? 'text-slate-400' : 'text-[#0076f2]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>

                {showTypeDropdown && !initialData && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-2xl z-[100] py-1 max-h-[250px] overflow-y-auto">
                    <div className="px-2 pb-2 pt-1 sticky top-0 bg-white">
                      <div className="relative">
                        <svg className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="text" placeholder="Search" className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-400" />
                      </div>
                    </div>
                    {dataTypes.map(dt => (
                      <div 
                        key={dt.value}
                        className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-[#eaf3ff] ${type === dt.value ? 'bg-[#0076f2] text-white hover:bg-[#0076f2]' : 'text-slate-700'}`}
                        onClick={() => { setType(dt.value); setShowTypeDropdown(false); }}
                      >
                        {dt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Is Mandatory Row */}
            <div className="flex items-center">
              <div className="w-1/3">
                <label className="text-[13px] text-slate-700 font-normal">Is Mandatory</label>
              </div>
              <div className="w-2/3 max-w-sm flex items-center h-[34px]">
                <input 
                  type="checkbox" 
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Show in list Row */}
            <div className="flex items-center">
              <div className="w-1/3">
                <label className="text-[13px] text-slate-700 font-normal">Show in List Views</label>
              </div>
              <div className="w-2/3 max-w-sm flex items-center h-[34px]">
                <input 
                  type="checkbox" 
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Prevent Duplicate Row */}
            <div className="flex items-center">
              <div className="w-1/3">
                <label className="text-[13px] text-slate-700 font-normal">Prevent Duplicate Values</label>
              </div>
              <div className="w-2/3 max-w-sm flex items-center h-[34px]">
                <input 
                  type="checkbox" 
                  checked={unique}
                  onChange={(e) => setUnique(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Dropdown Options Row */}
            {type === 'dropdown' && (
              <div className="flex items-start">
                <div className="w-1/3 pt-1">
                  <label className="text-[13px] text-slate-700 font-normal">Dropdown Options</label>
                </div>
                <div className="w-2/3 max-w-sm space-y-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newOption} 
                      onChange={(e) => setNewOption(e.target.value)} 
                      placeholder="Option value"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                    />
                    <button type="button" onClick={addOption} className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-sm hover:bg-slate-200">
                      Add
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    {options.map((opt, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm">
                        <span>{opt}</span>
                        <button type="button" onClick={() => removeOption(opt)} className="text-red-500 hover:text-red-700">&times;</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Group Tab Row */}
            <div className="flex items-center">
              <div className="w-1/3">
                <label className="text-[13px] text-slate-700 font-normal">Group / Tab</label>
              </div>
              <div className="w-2/3 max-w-sm">
                <input 
                  type="text" 
                  value={tab} 
                  onChange={(e) => setTab(e.target.value)} 
                  placeholder="e.g. General"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-200 flex space-x-3">
            <button 
              type="submit" 
              className="px-4 py-1.5 bg-[#0076f2] hover:bg-[#0066d6] text-white text-sm rounded shadow-sm transition-colors"
            >
              Save
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm rounded shadow-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
