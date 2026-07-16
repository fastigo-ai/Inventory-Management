"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export interface FieldMetadata {
  name: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
  editable: boolean;
  defaultValue?: any;
  options?: string[];
  tab?: string;
  order: number;
}

interface DynamicFormProps {
  fields: FieldMetadata[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function DynamicForm({ fields, initialData = {}, onSubmit, isLoading }: DynamicFormProps) {
  
  const defaultValues = fields.reduce((acc, field) => {
    acc[field.name] = initialData[field.name] ?? (field.defaultValue ?? "");
    return acc;
  }, {} as any);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues });

  // Get unique tabs
  const tabs = Array.from(new Set(fields.map(f => f.tab || "General")));
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {tabs.map(tab => {
        const tabFields = fields.filter(f => (f.tab || "General") === tab && f.visible).sort((a,b) => a.order - b.order);
        if (tabFields.length === 0) return null;

        return (
          <Card key={tab} className="border-slate-200 shadow-sm">
            <div className="border-b bg-slate-50/50 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-800">{tab}</h3>
            </div>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tabFields.map(field => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name} className="text-slate-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    
                    {field.type === 'text' || field.type === 'number' ? (
                      <Input 
                        id={field.name}
                        type={field.type}
                        disabled={!field.editable}
                        {...register(field.name, { 
                          required: field.required ? `${field.label} is required` : false,
                          valueAsNumber: field.type === 'number'
                        })} 
                        className="bg-white"
                      />
                    ) : field.type === 'dropdown' ? (
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
                    ) : field.type === 'boolean' ? (
                      <div className="flex items-center space-x-2 pt-2">
                        <input 
                          type="checkbox" 
                          id={field.name}
                          disabled={!field.editable}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          {...register(field.name)}
                        />
                        <label htmlFor={field.name} className="text-sm text-gray-700 font-medium cursor-pointer">
                          Enable
                        </label>
                      </div>
                    ) : null}

                    {errors[field.name] && (
                      <p className="text-sm text-red-500 font-medium">
                        {errors[field.name]?.message as string}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={isSubmitting || isLoading} className="w-full sm:w-auto">
          {isSubmitting || isLoading ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}
