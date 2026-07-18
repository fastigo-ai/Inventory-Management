import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Plus, X, MoreVertical } from 'lucide-react';

interface ContactPersonsWidgetProps {
  control: any;
  register: any;
  name: string;
}

export function ContactPersonsWidget({ control, register, name }: ContactPersonsWidgetProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name
  });

  React.useEffect(() => {
    if (fields.length === 0) {
      append({ salutation: '', firstName: '', lastName: '', email: '', workPhoneCode: '+91', workPhone: '', mobileCode: '+91', mobile: '' });
    }
  }, [fields, append]);

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 px-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-w-[120px]">Salutation</th>
              <th className="py-3 px-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-w-[150px]">First Name</th>
              <th className="py-3 px-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-w-[150px]">Last Name</th>
              <th className="py-3 px-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]">Email Address</th>
              <th className="py-3 px-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-w-[180px]">Work Phone</th>
              <th className="py-3 px-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-w-[180px]">Mobile</th>
              <th className="py-3 px-2 w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b border-slate-100 group">
                <td className="py-3 px-2">
                  <select 
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    {...register(`${name}[${index}].salutation`)}
                  >
                    <option value="">Salutation</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </td>
                <td className="py-3 px-2">
                  <Input 
                    type="text" 
                    className="h-9 w-full text-[13px] border border-slate-200 bg-white px-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    {...register(`${name}[${index}].firstName`)} 
                  />
                </td>
                <td className="py-3 px-2">
                  <Input 
                    type="text" 
                    className="h-9 w-full text-[13px] border border-slate-200 bg-white px-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    {...register(`${name}[${index}].lastName`)} 
                  />
                </td>
                <td className="py-3 px-2">
                  <Input 
                    type="email" 
                    className="h-9 w-full text-[13px] border border-slate-200 bg-white px-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    {...register(`${name}[${index}].email`)} 
                  />
                </td>
                <td className="py-3 px-2">
                  <div className="flex border border-slate-200 rounded-md focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white transition-colors">
                    <select 
                      className="h-9 w-[60px] shrink-0 border-r border-slate-200 bg-slate-50 px-1 text-[13px] focus:outline-none rounded-l-md" 
                      {...register(`${name}[${index}].workPhoneCode`)}
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                    </select>
                    <input 
                      type="text" 
                      className="h-9 w-full text-[13px] bg-transparent px-3 focus:outline-none rounded-r-md" 
                      {...register(`${name}[${index}].workPhone`)} 
                    />
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="flex border border-slate-200 rounded-md focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white transition-colors">
                    <select 
                      className="h-9 w-[60px] shrink-0 border-r border-slate-200 bg-slate-50 px-1 text-[13px] focus:outline-none rounded-l-md" 
                      {...register(`${name}[${index}].mobileCode`)}
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                    </select>
                    <input 
                      type="text" 
                      className="h-9 w-full text-[13px] bg-transparent px-3 focus:outline-none rounded-r-md" 
                      {...register(`${name}[${index}].mobile`)} 
                    />
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {index > 0 && (
                      <button 
                        type="button" 
                        onClick={() => remove(index)}
                        className="text-red-300 hover:text-red-500 focus:outline-none rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <button 
          type="button"
          onClick={() => append({ salutation: '', firstName: '', lastName: '', email: '', workPhoneCode: '+91', workPhone: '', mobileCode: '+91', mobile: '' })}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md transition-colors w-max"
        >
          <Plus className="w-4 h-4" /> Add Contact Person
        </button>
      </div>
    </div>
  );
}
