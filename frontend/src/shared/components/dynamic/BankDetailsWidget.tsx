import React, { useState } from 'react';
import { useWatch, useFieldArray } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react';
import { FileUploadWidget } from './FileUploadWidget';


interface BankDetailsWidgetProps {
  control: any;
  register: any;
  name: string;
}

const BankDetailsForm = ({ control, register, baseName, index, remove }: { control: any, register: any, baseName: string, index: number, remove: (index: number) => void }) => {
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const name = `${baseName}[${index}]`;

  return (
    <div className="space-y-6 pt-8 border-t border-slate-200 first:border-0 first:pt-0">
      
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[13px] font-medium text-slate-500 tracking-wide">BANK {index + 1}</h3>
        {index > 0 && (
          <button 
            type="button" 
            onClick={() => remove(index)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
        <label className="text-sm font-semibold text-slate-700">Account Holder Name</label>
        <Input type="text" className="h-9 w-full max-w-md text-[13px] bg-white focus:border-blue-400 focus:ring-[2px] focus:ring-blue-100 transition-all border-slate-200" {...register(`${name}.accountHolderName`)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
        <label className="text-sm font-semibold text-slate-700">Bank Name</label>
        <Input type="text" className="h-9 w-full max-w-md text-[13px] bg-white focus:border-blue-400 focus:ring-[2px] focus:ring-blue-100 transition-all border-slate-200" {...register(`${name}.bankName`)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
        <label className="text-sm font-semibold text-slate-700">Account Number</label>
        <div className="relative w-full max-w-md">
          <Input 
            type={showAccountNumber ? 'text' : 'password'} 
            placeholder="••••••••••••" 
            className="h-9 w-full text-[13px] bg-white pr-10 focus:border-blue-400 focus:ring-[2px] focus:ring-blue-100 transition-all border-slate-200 font-mono tracking-widest placeholder:tracking-normal" 
            {...register(`${name}.accountNumber`)}
          />
          <button 
            type="button" 
            onClick={() => setShowAccountNumber(!showAccountNumber)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
        <label className="text-sm font-semibold text-slate-700 pr-4">Re-enter Account Number</label>
        <Input type="text" className="h-9 w-full max-w-md text-[13px] bg-white focus:border-blue-400 focus:ring-[2px] focus:ring-blue-100 transition-all border-slate-200" {...register(`${name}.reEnterAccountNumber`)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
        <label className="text-sm font-semibold text-slate-700">IFSC</label>
        <Input type="text" className="h-9 w-full max-w-md text-[13px] bg-white focus:border-blue-400 focus:ring-[2px] focus:ring-blue-100 transition-all border-slate-200" {...register(`${name}.ifsc`)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-6 mt-4">
        <label className="text-sm font-semibold text-slate-700 mt-2">Bank Document</label>
        <div className="space-y-2 w-full max-w-md">
          <FileUploadWidget control={control} name={`${name}.document`} />
        </div>
      </div>

    </div>
  );
};

export function BankDetailsWidget({ control, register, name }: BankDetailsWidgetProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name
  });

  // Ensure there's at least one bank details block if none exist
  React.useEffect(() => {
    if (fields.length === 0) {
      append({ accountHolderName: '', bankName: '', accountNumber: '', reEnterAccountNumber: '', ifsc: '', document: '' });
    }
  }, [fields, append]);

  return (
    <div className="space-y-6 max-w-3xl">
      {fields.map((field, index) => (
        <BankDetailsForm key={field.id} control={control} register={register} baseName={name} index={index} remove={remove} />
      ))}
      
      <div className="pt-4 border-t border-slate-200 mt-8">
        <button 
          type="button"
          onClick={() => append({ accountHolderName: '', bankName: '', accountNumber: '', reEnterAccountNumber: '', ifsc: '', document: '' })}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors -ml-3"
        >
          <Plus className="w-4 h-4" /> Add New Bank
        </button>
      </div>
    </div>
  );
}
