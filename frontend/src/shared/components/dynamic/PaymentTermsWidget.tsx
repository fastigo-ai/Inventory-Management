import React from 'react';
import { useWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';

interface PaymentTermsWidgetProps {
  control: any;
  register: any;
  name: string;
}

const PaymentTermRow = ({ control, register, baseName, index }: { control: any, register: any, baseName: string, index: number }) => {
  const name = `${baseName}[${index}]`;
  const stage = useWatch({ control, name: `${name}.stage` });
  const type = useWatch({ control, name: `${name}.type` });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <select 
        className="h-9 w-[180px] rounded-md border border-slate-300 bg-white px-3 text-[13px]" 
        {...register(`${name}.stage`)}
      >
        <option value="">Select Stage</option>
        <option value="1st stage">1st stage</option>
        <option value="2nd stage">2nd stage</option>
        <option value="3rd stage">3rd stage</option>
      </select>

      {stage && (
        <select 
          className="h-9 w-[180px] rounded-md border border-slate-300 bg-white px-3 text-[13px]" 
          {...register(`${name}.type`)}
        >
          <option value="">Select Type</option>
          <option value="Advance">Advance</option>
          <option value="Adhoc">Adhoc</option>
          <option value="Before Advance">Before Advance</option>
          <option value="After Advance">After Advance</option>
        </select>
      )}

      {stage && type && (
        <>
          <div className="flex items-center space-x-2">
            <Input 
              type="number" 
              placeholder="Value" 
              className="h-9 w-[120px] text-[13px] bg-white" 
              {...register(`${name}.value`)} 
            />
            <select 
              className="h-9 w-[80px] rounded-md border border-slate-300 bg-white px-2 text-[13px]" 
              {...register(`${name}.unit`)}
            >
              <option value="%">%</option>
              <option value="Amount">Amount</option>
            </select>
          </div>
          <Input 
            type="text" 
            placeholder="Remark (optional)" 
            className="h-9 w-[220px] text-[13px] bg-white" 
            {...register(`${name}.remark`)} 
          />
        </>
      )}
    </div>
  );
};

export function PaymentTermsWidget({ control, register, name }: PaymentTermsWidgetProps) {
  return (
    <div className="space-y-4">
      <PaymentTermRow control={control} register={register} baseName={name} index={0} />
      <PaymentTermRow control={control} register={register} baseName={name} index={1} />
      <PaymentTermRow control={control} register={register} baseName={name} index={2} />
    </div>
  );
}
