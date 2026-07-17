"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UploadCloud } from "lucide-react";

export interface FieldMetadata {
  name: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
  editable: boolean;
  unique?: boolean;
  active?: boolean;
  systemLocked?: boolean;
  defaultValue?: any;
  options?: string[];
  tab?: string;
  order: number;
  colSpan?: number;
  sectionToggle?: boolean;
  widget?: string;
  hasInfo?: boolean;
  checkboxLabel?: string;
  labelColor?: string;
}

interface DynamicFormProps {
  fields: FieldMetadata[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  layoutStyle?: 'sections' | 'tabs';
  formHeader?: React.ReactNode;
}

export function DynamicForm({ fields, initialData = {}, onSubmit, isLoading, layoutStyle = 'sections', formHeader }: DynamicFormProps) {
  
  const defaultValues = fields.reduce((acc, field) => {
    acc[field.name] = initialData[field.name] ?? (field.defaultValue ?? (field.type === 'boolean' ? false : ""));
    return acc;
  }, {} as any);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues });

  // Get unique tabs, ensuring 'Basic'/'Basic Info' is first if it exists
  const allTabs = Array.from(new Set(fields.map(f => f.tab || "General")));
  const sortedTabs = allTabs.sort((a, b) => a.includes('Basic') ? -1 : b.includes('Basic') ? 1 : 0);
  
  const basicTabName = sortedTabs.find(t => t.includes('Basic'));
  const remainingTabs = sortedTabs.filter(t => t !== basicTabName);
  
  // State for active tab (used only if layoutStyle === 'tabs')
  const [activeTab, setActiveTab] = useState(remainingTabs.length > 0 ? remainingTabs[0] : "");

  const renderTabFields = (tabName: string) => {
    const tabFields = fields.filter(f => (f.tab || "General") === tabName && f.visible && f.active !== false).sort((a,b) => a.order - b.order);
    if (tabFields.length === 0) return null;

        const toggleField = tabFields.find(f => f.sectionToggle);
        const nonToggleFields = tabFields.filter(f => !f.sectionToggle);
        const isSectionEnabled = toggleField ? watch(toggleField.name) : true;

        if (tabName === 'Basic' || tabName === 'Basic Info') {
           // Basic gets a special 2-column parent layout where right side is Images
           const imageField = nonToggleFields.find(f => f.widget === 'image_upload');
           const leftFields = nonToggleFields.filter(f => f.widget !== 'image_upload');
           return (
             <div key={tabName} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
                <div className={`grid grid-cols-1 gap-6 ${imageField ? 'md:col-span-7' : 'md:col-span-12 max-w-3xl'}`}>
                  {leftFields.map(field => (
                    <div key={field.name}>{renderField(field, register, errors, control, layoutStyle)}</div>
                  ))}
                </div>
                {imageField && (
                  <div className="md:col-span-5 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center h-48 hover:bg-slate-100 transition-colors cursor-pointer mt-1">
                     <UploadCloud className="w-10 h-10 text-[#0076f2] mb-3" />
                     <p className="text-sm font-semibold text-slate-700">Drag & Drop Images</p>
                     <p className="text-xs text-slate-500 px-8 text-center mt-2">You can add up to 15 images including front, rear and other images, each not exceeding 5 MB.</p>
                  </div>
                )}
             </div>
           );
        }

        return (
          <div key={tabName} className={`transition-opacity duration-200 ${!isSectionEnabled ? 'opacity-50' : ''} ${layoutStyle === 'sections' ? 'border-t border-slate-200' : ''}`}>
            {layoutStyle === 'sections' && (
              <div className="bg-transparent py-4 flex items-center space-x-3">
                {toggleField && (
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300 text-[#0076f2] focus:ring-[#0076f2]"
                    {...register(toggleField.name)}
                  />
                )}
                <h3 className="text-[15px] font-medium text-slate-800">{tabName}</h3>
              </div>
            )}
            {isSectionEnabled && (
              <div className={layoutStyle === 'sections' ? "pt-2 pb-8" : "pt-6 pb-6 max-w-3xl"}>
                <div className="grid grid-cols-1 gap-y-6">
                  {nonToggleFields.map(field => (
                    <div key={field.name} className={`space-y-2 ${field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}`}>
                      {renderField(field, register, errors, control, layoutStyle)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formHeader}
      
      {/* Basic Info at top */}
      {basicTabName && renderTabFields(basicTabName)}

      {/* Tabs / Sections */}
      {remainingTabs.length > 0 && layoutStyle === 'tabs' && (
        <div className="border-b border-slate-200 mt-8 mb-6">
          <nav className="-mb-px flex space-x-8">
            {remainingTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab 
                    ? 'border-[#0076f2] text-[#0076f2]' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      )}

      {remainingTabs.length > 0 && layoutStyle === 'tabs' && renderTabFields(activeTab)}
      {remainingTabs.length > 0 && layoutStyle === 'sections' && remainingTabs.map(tab => renderTabFields(tab))}

      <div className="sticky bottom-0 h-16 bg-white border-t border-slate-200 flex items-center px-6 gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] -mx-6 -mb-6 mt-6 rounded-b-lg">
        <Button type="submit" size="default" disabled={isSubmitting || isLoading} className="bg-[#0076f2] hover:bg-[#0060c5] text-white px-6 font-normal">
          {isSubmitting || isLoading ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" size="default" className="text-slate-700 font-normal px-6 bg-white hover:bg-slate-50">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function renderField(field: FieldMetadata, register: any, errors: any, control: any, layoutStyle: string = 'sections') {
  let fieldInput = null;

  if (field.type === 'text_multi' || field.widget === 'textarea') {
    fieldInput = (
      <Textarea 
        id={field.name}
        disabled={!field.editable}
        {...register(field.name, { required: field.required ? `${field.label} is required` : false })} 
        className="bg-white min-h-[80px]"
      />
    );
  } else if (field.widget === 'radio') {
    fieldInput = (
      <Controller
        control={control}
        name={field.name}
        rules={{ required: field.required ? `${field.label} is required` : false }}
        render={({ field: { onChange, value } }) => (
          <RadioGroup onValueChange={onChange} defaultValue={value} className="flex space-x-6">
            {field.options?.map(opt => (
              <div className="flex items-center space-x-2" key={opt}>
                <RadioGroupItem value={opt} id={`${field.name}-${opt}`} />
                <Label htmlFor={`${field.name}-${opt}`} className="text-sm font-normal text-slate-700">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        )}
      />
    );
  } else if (field.widget === 'dimensions') {
    fieldInput = (
       <div className="flex space-x-2 items-center">
         <Input type="number" placeholder="L" className="w-20" {...register(`${field.name}_L`)} />
         <span className="text-slate-400">x</span>
         <Input type="number" placeholder="W" className="w-20" {...register(`${field.name}_W`)} />
         <span className="text-slate-400">x</span>
         <Input type="number" placeholder="H" className="w-20" {...register(`${field.name}_H`)} />
         <select className="ml-2 h-10 rounded-md border border-input bg-white px-3 py-2 text-sm" {...register(`${field.name}_unit`)}>
            <option value="cm">cm</option>
            <option value="in">in</option>
         </select>
       </div>
    );
  } else if (field.widget === 'weight') {
    fieldInput = (
       <div className="flex space-x-2 items-center">
         <Input type="number" placeholder="0.00" className="w-32" {...register(field.name)} />
         <select className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm" {...register(`${field.name}_unit`)}>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="lb">lb</option>
         </select>
       </div>
    );
  } else if (field.type === 'dropdown') {
    fieldInput = (
      <select 
        id={field.name}
        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!field.editable}
        {...register(field.name, { required: field.required ? `${field.label} is required` : false })}
      >
        <option value="">Select...</option>
        {field.options?.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  } else if (field.type === 'boolean') {
    fieldInput = (
      <div className="flex items-center space-x-2 pt-2">
        <input 
          type="checkbox" 
          id={field.name}
          disabled={!field.editable}
          className="h-4 w-4 rounded border-gray-300 text-[#0076f2] focus:ring-[#0076f2]"
          {...register(field.name)}
        />
        <label htmlFor={field.name} className="text-[13px] text-slate-700 cursor-pointer">
          {field.checkboxLabel || 'Yes'}
        </label>
      </div>
    );
  } else if (field.widget === 'vendor_primary_contact') {
    fieldInput = (
      <div className="flex items-center space-x-4">
        <select className="h-9 w-[120px] rounded-md border border-slate-300 bg-white px-3 text-[13px]" {...register('primaryContact.salutation')}>
          <option value="">Salutation</option>
          <option value="Mr.">Mr.</option>
          <option value="Mrs.">Mrs.</option>
          <option value="Ms.">Ms.</option>
          <option value="Dr.">Dr.</option>
        </select>
        <Input placeholder="First Name" className="h-9 text-[13px] bg-white flex-1" {...register('primaryContact.firstName')} />
        <Input placeholder="Last Name" className="h-9 text-[13px] bg-white flex-1" {...register('primaryContact.lastName')} />
      </div>
    );
  } else if (field.widget === 'vendor_phone') {
    fieldInput = (
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 flex-1">
          <select className="h-9 w-[80px] rounded-md border border-slate-300 bg-white px-2 text-[13px]" {...register('phone.workCountryCode')}>
            <option value="+91">+91</option>
            <option value="+1">+1</option>
          </select>
          <Input placeholder="Work Phone" className="h-9 text-[13px] bg-white flex-1" {...register('phone.work')} />
        </div>
        <div className="flex items-center space-x-2 flex-1">
          <select className="h-9 w-[80px] rounded-md border border-slate-300 bg-white px-2 text-[13px]" {...register('phone.mobileCountryCode')}>
            <option value="+91">+91</option>
            <option value="+1">+1</option>
          </select>
          <Input placeholder="Mobile" className="h-9 text-[13px] bg-white flex-1" {...register('phone.mobile')} />
        </div>
      </div>
    );
  } else {
    fieldInput = (
      <Input 
        id={field.name}
        type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : field.type === 'number' || field.type === 'decimal' || field.type === 'amount' ? 'number' : 'text'}
        step={field.type === 'decimal' || field.type === 'amount' ? '0.01' : undefined}
        disabled={!field.editable}
        {...register(field.name, { 
          required: field.required ? `${field.label} is required` : false,
          valueAsNumber: field.type === 'number' || field.type === 'decimal' || field.type === 'amount'
        })} 
        className="bg-white"
      />
    );
  }

  return (
    <div className={layoutStyle === 'tabs' ? "grid grid-cols-[200px_1fr] items-center gap-6" : `grid ${field.tab === 'Basic' ? 'grid-cols-3' : 'grid-cols-1'} items-center gap-4`}>
      <div className={layoutStyle === 'tabs' ? "flex items-center space-x-1" : ""}>
        <Label htmlFor={field.name} className={layoutStyle === 'tabs' ? `text-[13px] ${field.labelColor === 'red' ? 'text-red-500' : 'text-slate-800'}` : `text-[13px] text-slate-600 ${field.tab === 'Basic' ? 'col-span-1' : ''}`}>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        {layoutStyle === 'tabs' && field.hasInfo && (
          <div className="text-slate-400 hover:text-slate-600 cursor-help" title={`Information about ${field.label}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
        )}
      </div>
      
      <div className={layoutStyle === 'tabs' ? "" : (field.tab === 'Basic' ? 'col-span-2' : '')}>
        {fieldInput}
        
        {errors[field.name] && (
          <p className="text-xs text-red-500 mt-1 font-medium">
            {errors[field.name]?.message as string}
          </p>
        )}
      </div>
    </div>
  );
}
