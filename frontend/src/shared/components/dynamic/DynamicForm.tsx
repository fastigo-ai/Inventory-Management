"use client";

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
}

interface DynamicFormProps {
  fields: FieldMetadata[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function DynamicForm({ fields, initialData = {}, onSubmit, isLoading }: DynamicFormProps) {
  
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

  // Get unique tabs, ensuring 'Basic' is first if it exists
  const allTabs = Array.from(new Set(fields.map(f => f.tab || "General")));
  const tabs = allTabs.sort((a, b) => a === 'Basic' ? -1 : b === 'Basic' ? 1 : 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {tabs.map(tab => {
        const tabFields = fields.filter(f => (f.tab || "General") === tab && f.visible && f.active !== false).sort((a,b) => a.order - b.order);
        if (tabFields.length === 0) return null;

        // Check if this tab has a sectionToggle field
        const toggleField = tabFields.find(f => f.sectionToggle);
        const nonToggleFields = tabFields.filter(f => !f.sectionToggle);
        const isSectionEnabled = toggleField ? watch(toggleField.name) : true;

        if (tab === 'Basic') {
           // Basic gets a special 2-column parent layout where right side is Images
           const imageField = nonToggleFields.find(f => f.widget === 'image_upload');
           const leftFields = nonToggleFields.filter(f => f.widget !== 'image_upload');
           return (
             <div key={tab} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
                <div className="md:col-span-7 grid grid-cols-1 gap-6">
                  {leftFields.map(field => (
                    <div key={field.name}>{renderField(field, register, errors, control)}</div>
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
          <div key={tab} className={`border-t border-slate-200 transition-opacity duration-200 ${!isSectionEnabled ? 'opacity-50' : ''}`}>
            <div className="bg-transparent py-4 flex items-center space-x-3">
              {toggleField && (
                <input 
                  type="checkbox" 
                  className="h-4 w-4 rounded border-gray-300 text-[#0076f2] focus:ring-[#0076f2]"
                  {...register(toggleField.name)}
                />
              )}
              <h3 className="text-[15px] font-medium text-slate-800">{tab}</h3>
            </div>
            {isSectionEnabled && (
              <div className="pt-2 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {nonToggleFields.map(field => (
                    <div key={field.name} className={`space-y-2 ${field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}`}>
                      {renderField(field, register, errors, control)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="sticky bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center px-6 gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] -mx-10 mt-6">
        <Button type="submit" size="default" disabled={isSubmitting || isLoading} className="bg-[#0076f2] hover:bg-[#0060c5] text-white px-6 font-normal">
          {isSubmitting || isLoading ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" size="default" className="text-slate-700 font-normal px-6">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function renderField(field: FieldMetadata, register: any, errors: any, control: any) {
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
        <label htmlFor={field.name} className="text-sm text-gray-700 font-medium cursor-pointer">
          Yes
        </label>
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
    <div className={`grid ${field.tab === 'Basic' ? 'grid-cols-3' : 'grid-cols-1'} items-center gap-4`}>
      <Label htmlFor={field.name} className={`text-[13px] text-slate-600 ${field.tab === 'Basic' ? 'col-span-1' : ''}`}>
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className={`${field.tab === 'Basic' ? 'col-span-2' : ''}`}>
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
