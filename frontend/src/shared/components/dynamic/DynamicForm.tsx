"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UploadCloud, Globe, MessageCircle, Info } from "lucide-react";
import { PaymentTermsWidget } from "./PaymentTermsWidget";
import { FileUploadWidget } from "./FileUploadWidget";
import { BankDetailsWidget } from "./BankDetailsWidget";
import { ContactPersonsWidget } from "./ContactPersonsWidget";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

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
  icon?: string;
  placeholder?: string;
  helperText?: string;
  dependsOn?: string;
  dependsOnOptions?: any;
}

interface DynamicFormProps {
  fields: FieldMetadata[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  layoutStyle?: 'sections' | 'tabs';
  formHeader?: React.ReactNode;
  onCancel?: () => void;
  submitLabel?: string;
}

export function DynamicForm({ fields, initialData = {}, onSubmit, isLoading, layoutStyle = 'sections', formHeader, onCancel, submitLabel }: DynamicFormProps) {
  
  const defaultValues = fields.reduce((acc, field) => {
    acc[field.name] = initialData[field.name] ?? (field.defaultValue ?? (field.type === 'boolean' ? false : ""));
    return acc;
  }, {} as any);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues });

  // Handle dependent fields reset when parent changes
  const dependentFields = fields.filter(f => f.dependsOn);
  
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name) {
        // GST & PAN Auto-formatting logic
        const lowerName = name.toLowerCase();
        const val = value[name as keyof typeof value];
        if (typeof val === 'string' && (lowerName.includes('gst') || lowerName.includes('pan'))) {
          // Auto-capitalize
          if (val !== val.toUpperCase()) {
             setValue(name, val.toUpperCase(), { shouldValidate: true, shouldDirty: true });
          }
          
          // If GSTIN is entered, auto-extract PAN (Characters 3 to 12)
          if (lowerName.includes('gst')) {
             const panMatch = val.substring(2, 12).toUpperCase();
             // Find the PAN field name in the form
             const panFieldName = Object.keys(value).find(k => k.toLowerCase() === 'pan');
             if (panFieldName) {
                const currentPan = value[panFieldName as keyof typeof value] || '';
                if (currentPan !== panMatch) {
                   setValue(panFieldName, panMatch, { shouldValidate: true, shouldDirty: true });
                }
             }
          }
        }
      }

      // Find if the changed field is a parent of any dependent field
      const dependents = dependentFields.filter(df => df.dependsOn === name);
      if (dependents.length > 0) {
        dependents.forEach(df => {
          const currentVal = value[df.name as keyof typeof value];
          if (currentVal) {
            const parentValue = value[name as keyof typeof value];
            const validOptions = (df.dependsOnOptions && parentValue && df.dependsOnOptions[parentValue]) 
              ? df.dependsOnOptions[parentValue] 
              : [];
            
            // If current value is not in the new valid options, reset it
            if (!validOptions.includes(currentVal as string)) {
              setValue(df.name, "");
            }
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, dependentFields, setValue]);

  // Get unique tabs, ensuring 'Basic'/'Basic Info' is first if it exists
  const allTabs = Array.from(new Set(fields.map(f => f.tab || "General")));
  const sortedTabs = allTabs.sort((a, b) => a.includes('Basic') ? -1 : b.includes('Basic') ? 1 : 0);
  
  const basicTabName = sortedTabs.find(t => t.includes('Basic'));
  const remainingTabs = sortedTabs.filter(t => t !== basicTabName);
  
  // State for active tab (used only if layoutStyle === 'tabs')
  const [activeTab, setActiveTab] = useState(remainingTabs.length > 0 ? remainingTabs[0] : "");

  const renderTabFields = (tabName: string) => {
    const tabFields = fields.filter(f => (f.tab || "General") === tabName && f.active !== false).sort((a,b) => a.order - b.order);
    if (tabFields.length === 0) return null;

        const toggleField = tabFields.find(f => f.sectionToggle);
        const nonToggleFields = tabFields.filter(f => !f.sectionToggle);
        const isSectionEnabled = toggleField ? watch(toggleField.name) : true;

        if (tabName === 'Basic' || tabName === 'Basic Info') {
           // Basic gets a special 2-column parent layout where right side is Images
           const imageField = nonToggleFields.find(f => f.widget === 'image_upload');
           const leftFields = nonToggleFields.filter(f => f.widget !== 'image_upload');
           
           if (layoutStyle === 'sections') {
             return (
               <Card key={tabName} className="mb-6 shadow-sm border-slate-200">
                 <CardContent className="p-6">
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                     <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 ${imageField ? 'md:col-span-8' : 'md:col-span-12'}`}>
                       {leftFields.map(field => (
                         <div key={field.name} className={field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}>
                           {renderField(field, register, errors, control, layoutStyle, setValue, getValues, watch)}
                         </div>
                       ))}
                     </div>
                     {imageField && (
                       <div className="md:col-span-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center h-48 hover:bg-slate-100 transition-colors cursor-pointer mt-1">
                          <UploadCloud className="w-10 h-10 text-[#0076f2] mb-3" />
                          <p className="text-sm font-semibold text-slate-700">Drag & Drop Images</p>
                          <p className="text-xs text-slate-500 px-8 text-center mt-2">Add up to 15 images (front, rear, etc). Max 5 MB each.</p>
                       </div>
                     )}
                   </div>
                 </CardContent>
               </Card>
             );
           }
           
           // Tabs layout
           return (
             <div key={tabName} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 ${imageField ? 'md:col-span-7' : 'md:col-span-12'}`}>
                  {leftFields.map(field => (
                    <div key={field.name} className={field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}>{renderField(field, register, errors, control, 'sections', setValue, getValues, watch)}</div>
                  ))}
                </div>
                {imageField && (
                  <div className="md:col-span-5 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center h-48 hover:bg-slate-100 transition-colors cursor-pointer mt-1">
                     <UploadCloud className="w-10 h-10 text-[#0076f2] mb-3" />
                     <p className="text-sm font-semibold text-slate-700">Drag & Drop Images</p>
                     <p className="text-xs text-slate-500 px-8 text-center mt-2">Add up to 15 images (front, rear, etc). Max 5 MB each.</p>
                  </div>
                )}
             </div>
           );
        }

        if (layoutStyle === 'sections') {
          return (
            <Card key={tabName} className={`mb-6 shadow-sm border-slate-200 transition-opacity duration-200 ${!isSectionEnabled ? 'opacity-50 grayscale-[0.2]' : ''}`}>
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex flex-row items-center space-x-3 space-y-0">
                {toggleField && (
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300 text-[#0076f2] focus:ring-[#0076f2] cursor-pointer"
                    {...register(toggleField.name)}
                  />
                )}
                <CardTitle className="text-[16px] font-semibold text-slate-800 m-0">{tabName}</CardTitle>
              </CardHeader>
              {isSectionEnabled && (
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {nonToggleFields.map(field => (
                      <div key={field.name} className={field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}>
                        {renderField(field, register, errors, control, layoutStyle, setValue, getValues, watch)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        }

        // Tabs layout
        return (
          <div key={tabName} className={`transition-opacity duration-200 ${!isSectionEnabled ? 'opacity-50' : ''}`}>
            {isSectionEnabled && (
              <div className="pt-6 pb-6 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {nonToggleFields.map(field => (
                    <div key={field.name} className={field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}>
                      {renderField(field, register, errors, control, 'sections', setValue, getValues, watch)}
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

      <div className={`sticky bottom-0 h-16 ${layoutStyle === 'sections' ? 'bg-slate-50/80 backdrop-blur-md border-t border-slate-200/60 rounded-b-xl shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] mx-0 mb-0 mt-6 px-6' : 'bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] -mx-6 -mb-6 mt-6 rounded-b-lg px-6'} flex items-center gap-3 z-10`}>
        <Button type="submit" size="default" disabled={isSubmitting || isLoading} className="bg-[#0076f2] hover:bg-[#0060c5] text-white px-6 font-normal">
          {isSubmitting || isLoading ? "Saving..." : (submitLabel || "Save")}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" size="default" className="text-slate-700 font-normal px-6 bg-white hover:bg-slate-50">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function renderField(field: FieldMetadata, register: any, errors: any, control: any, layoutStyle: string = 'sections', setValue?: any, getValues?: any, watch?: any) {
  let fieldInput = null;

  if (field.widget === 'vendor_address') {
    const renderAddressSide = (type: 'billing' | 'shipping', title: string, hasCopy: boolean) => {
      const prefix = `${field.name}.${type}`;
      return (
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-800 text-[15px]">{title}</h3>
            {hasCopy && (
              <button 
                type="button" 
                className="text-[#0076f2] text-[13px] font-medium hover:underline flex items-center"
                onClick={() => {
                  if (setValue && getValues) {
                    const billing = getValues(`${field.name}.billing`);
                    if (billing) {
                      setValue(`${field.name}.shipping`, billing);
                    }
                  }
                }}
              >
                <span className="mr-1">⬇</span> Copy billing address
              </button>
            )}
          </div>
          <div className="space-y-4">
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Attention</Label>
                <Input className="h-9 text-[13px] bg-white" {...register(`${prefix}.attention`)} />
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Country/Region</Label>
                <select className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[13px]" {...register(`${prefix}.country`)}>
                  <option value="">Select</option>
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                </select>
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Address</Label>
                <div className="space-y-2">
                  <Textarea className="text-[13px] min-h-[60px] bg-white" placeholder="Street 1" {...register(`${prefix}.street1`)} />
                  <Textarea className="text-[13px] min-h-[60px] bg-white" placeholder="Street 2" {...register(`${prefix}.street2`)} />
                </div>
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">City</Label>
                <Input className="h-9 text-[13px] bg-white" {...register(`${prefix}.city`)} />
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">State</Label>
                <select className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[13px]" {...register(`${prefix}.state`)}>
                  <option value="">Select or type to add</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Pin Code</Label>
                <Input className="h-9 text-[13px] bg-white" {...register(`${prefix}.zip`)} />
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Phone</Label>
                <div className="flex items-center space-x-2 w-full">
                  <select className="h-9 w-[70px] rounded-md border border-slate-300 bg-white px-1 text-[13px]" {...register(`${prefix}.phoneCode`)}>
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                  </select>
                  <Input className="h-9 text-[13px] flex-1 bg-white" {...register(`${prefix}.phone`)} />
                </div>
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Fax Number</Label>
                <Input className="h-9 text-[13px] bg-white" {...register(`${prefix}.fax`)} />
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="col-span-full pt-2 -ml-2 pb-6">
         <div className="flex flex-col md:flex-row gap-12 mb-8">
            {renderAddressSide('billing', 'Billing Address', false)}
            {renderAddressSide('shipping', 'Factory Address', true)}
         </div>
         <div className="bg-[#fff9eb] border-l-2 border-[#f5b849] p-4 text-sm rounded-r-md">
            <h4 className="font-semibold text-slate-800 mb-1">Note:</h4>
            <ul className="list-disc list-inside text-[13px] text-slate-700 space-y-1 ml-1 marker:text-slate-500">
              <li>Add and manage additional addresses from this Customers and Vendors details section.</li>
              <li>You can customise how customers' addresses are displayed in transaction PDFs. To do this, go to Settings &gt; Preferences &gt; Customers and Vendors, and navigate to the Address Format sections.</li>
            </ul>
         </div>
      </div>
    );
  }

  if (field.widget === 'single_address') {
    const renderAddressSide = (type: 'billing', title: string) => {
      const prefix = `${field.name}.${type}`;
      return (
        <div className="flex-1 min-w-0 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-800 text-[15px]">{title}</h3>
          </div>
          <div className="space-y-4">
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Attention</Label>
                <Input className="h-9 text-[13px] bg-white" {...register(`${prefix}.attention`)} />
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Country/Region</Label>
                <select className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[13px]" {...register(`${prefix}.country`)}>
                  <option value="">Select</option>
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                </select>
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Address</Label>
                <div className="space-y-2">
                  <Textarea className="text-[13px] min-h-[60px] bg-white" placeholder="Street 1" {...register(`${prefix}.street1`)} />
                  <Textarea className="text-[13px] min-h-[60px] bg-white" placeholder="Street 2" {...register(`${prefix}.street2`)} />
                </div>
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">City</Label>
                <Input className="h-9 text-[13px] bg-white" {...register(`${prefix}.city`)} />
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">State</Label>
                <select className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[13px]" {...register(`${prefix}.state`)}>
                  <option value="">Select or type to add</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Pin Code</Label>
                <Input className="h-9 text-[13px] bg-white" {...register(`${prefix}.zip`)} />
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Phone</Label>
                <div className="flex items-center space-x-2 w-full">
                  <select className="h-9 w-[70px] rounded-md border border-slate-300 bg-white px-1 text-[13px]" {...register(`${prefix}.phoneCode`)}>
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                  </select>
                  <Input className="h-9 text-[13px] flex-1 bg-white" {...register(`${prefix}.phone`)} />
                </div>
             </div>
             <div className="grid grid-cols-[130px_1fr] items-start gap-4">
                <Label className="text-[13px] text-slate-600 pt-2">Fax Number</Label>
                <Input className="h-9 text-[13px] bg-white" {...register(`${prefix}.fax`)} />
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="col-span-full pt-2 -ml-2 pb-6">
         <div className="mb-8">
            {renderAddressSide('billing', 'Contractor Address')}
         </div>
      </div>
    );
  }

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
  } else if (field.name === 'displayName') {
    let options: string[] = [];
    if (watch) {
      const companyName = watch('companyName') || '';
      const primaryContact = watch('primaryContact') || {};
      const firstName = primaryContact.firstName || '';
      const lastName = primaryContact.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const possibleOptions = [
        fullName,
        companyName,
        companyName && fullName ? `${companyName} - ${fullName}` : '',
        companyName && fullName ? `${fullName} - ${companyName}` : ''
      ];

      options = possibleOptions.filter(opt => opt.length > 0);
      options = Array.from(new Set(options)); // Deduplicate
    }
    if (options.length === 0) {
      options = ['Select or type to add'];
    }

    fieldInput = (
      <div className="relative">
        <Input
          id={field.name}
          list={`${field.name}-options`}
          autoComplete="off"
          disabled={!field.editable}
          placeholder="Select or type to add"
          {...register(field.name, { required: field.required ? `${field.label} is required` : false })}
          className="bg-white"
        />
        <datalist id={`${field.name}-options`}>
          {options.map(opt => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </div>
    );
  } else if (field.type === 'dropdown') {
    let currentOptions = field.options || [];
    
    if (field.dependsOn && watch) {
      const parentValue = watch(field.dependsOn);
      if (parentValue && field.dependsOnOptions && field.dependsOnOptions[parentValue]) {
        currentOptions = field.dependsOnOptions[parentValue];
      } else if (field.dependsOn) {
        currentOptions = []; // Empty if parent not selected or no mapping exists
      }
    }

    fieldInput = (
      <select 
        id={field.name}
        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!field.editable}
        {...register(field.name, { required: field.required ? `${field.label} is required` : false })}
      >
        <option value="">Select...</option>
        {currentOptions.map((opt: any) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr_1fr] items-start gap-4">
        <select className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none" {...register('primaryContact.salutation')}>
          <option value="">Salutation</option>
          <option value="Mr.">Mr.</option>
          <option value="Mrs.">Mrs.</option>
          <option value="Ms.">Ms.</option>
          <option value="Dr.">Dr.</option>
        </select>
        <Input placeholder="First Name" className="h-9 text-[13px] bg-white w-full" {...register('primaryContact.firstName')} />
        <Input placeholder="Last Name" className="h-9 text-[13px] bg-white w-full" {...register('primaryContact.lastName')} />
      </div>
    );
  } else if (field.widget === 'vendor_phone') {
    fieldInput = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="flex">
          <select className="h-9 w-[70px] shrink-0 rounded-l-md border border-slate-300 border-r-0 bg-slate-50 px-2 text-[13px] focus:outline-none" {...register('phone.workCountryCode')}>
            <option value="+91">+91</option>
            <option value="+1">+1</option>
          </select>
          <Input placeholder="Work Phone" className="h-9 text-[13px] bg-white flex-1 rounded-l-none" {...register('phone.work')} />
        </div>
        <div className="flex">
          <select className="h-9 w-[70px] shrink-0 rounded-l-md border border-slate-300 border-r-0 bg-slate-50 px-2 text-[13px] focus:outline-none" {...register('phone.mobileCountryCode')}>
            <option value="+91">+91</option>
            <option value="+1">+1</option>
          </select>
          <Input placeholder="Mobile" className="h-9 text-[13px] bg-white flex-1 rounded-l-none" {...register('phone.mobile')} />
        </div>
      </div>
    );
  } else if (field.widget === 'payment_terms_complex') {
    fieldInput = (
      <PaymentTermsWidget control={control} register={register} name={field.name} />
    );
  } else if (field.widget === 'vendor_bank_details') {
    fieldInput = (
      <BankDetailsWidget control={control} register={register} name={field.name} />
    );
  } else if (field.widget === 'vendor_contact_persons') {
    fieldInput = (
      <ContactPersonsWidget control={control} register={register} name={field.name} />
    );
  } else if (field.widget === 'file_upload') {
    fieldInput = (
      <FileUploadWidget control={control} name={field.name} />
    );
  } else if (field.icon) {
    const TwitterIcon = (props: any) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
    const FacebookIcon = (props: any) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
      </svg>
    );
    const getIcon = (name: string) => {
      switch (name) {
        case 'globe': return Globe;
        case 'twitter': return TwitterIcon;
        case 'facebook': return FacebookIcon;
        case 'skype': return MessageCircle;
        default: return Globe;
      }
    };
    const Icon = getIcon(field.icon);
    
    fieldInput = (
      <div>
        <div className="flex h-9 rounded-md border border-slate-300 overflow-hidden bg-white">
          <div className="flex items-center justify-center px-3 bg-slate-50 border-r border-slate-300">
             <Icon className="w-4 h-4 text-slate-500" />
          </div>
          <Input 
            id={field.name}
            type="text"
            disabled={!field.editable}
            placeholder={field.placeholder}
            {...register(field.name, { required: field.required ? `${field.label} is required` : false })} 
            className="flex-1 h-full border-0 focus-visible:ring-0 rounded-none shadow-none text-[13px]"
          />
        </div>
        {field.helperText && (
          <p className="text-xs text-slate-500 mt-1">{field.helperText}</p>
        )}
      </div>
    );
  } else {
    fieldInput = (
      <div>
        <Input 
          id={field.name}
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : field.type === 'number' || field.type === 'decimal' || field.type === 'amount' ? 'number' : 'text'}
          step={field.type === 'decimal' || field.type === 'amount' || field.type === 'number' ? 'any' : undefined}
          disabled={!field.editable}
          placeholder={field.placeholder}
          {...register(field.name, { 
            required: field.required ? `${field.label} is required` : false,
            valueAsNumber: field.type === 'number' || field.type === 'decimal' || field.type === 'amount'
          })} 
          className="bg-white"
        />
        {field.helperText && (
          <p className="text-xs text-slate-500 mt-1">{field.helperText}</p>
        )}
      </div>
    );
  }

  if (field.colSpan === 2) {
    return (
      <div className="w-full pb-2">
        {field.label && (
          <div className="flex items-center space-x-1 mb-2">
            <Label htmlFor={field.name} className={`text-[13px] ${field.labelColor === 'red' ? 'text-red-500' : 'text-slate-800'}`}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            {field.hasInfo && (
              <div className="text-slate-400 hover:text-slate-600 cursor-help" title={`Information about ${field.label}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
            )}
          </div>
        )}
        <div>
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

  return (
    <div className={layoutStyle === 'tabs' ? "grid grid-cols-1 sm:grid-cols-[160px_1fr] md:grid-cols-[200px_1fr] sm:items-start gap-4 sm:gap-6" : "flex flex-col space-y-1.5"}>
      <div className={layoutStyle === 'tabs' ? "flex sm:justify-end sm:pt-2 space-x-1" : "flex items-center space-x-1"}>
        <Label htmlFor={field.name} className={layoutStyle === 'tabs' ? `text-[13px] sm:text-right ${field.labelColor === 'red' ? 'text-red-500' : 'text-slate-800'}` : `text-[13px] font-medium ${field.labelColor === 'red' ? 'text-red-500' : 'text-slate-700'}`}>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        {field.hasInfo && (
          <div className="text-slate-400 hover:text-slate-600 cursor-help" title={`Information about ${field.label}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
        )}
      </div>
      
      <div className={layoutStyle === 'tabs' ? "" : "w-full"}>
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
