const fs = require('fs');
const path = './frontend/src/app/ho-billing/contractor-work-orders/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace State Variables
code = code.replace(
  "const [handoverContractorId, setHandoverContractorId] = useState('');",
  "const [handoverAssignments, setHandoverAssignments] = useState<Record<number, string>>({});"
);

// 2. Replace handleHandoverSubmit
const oldHandle = `const handleHandoverSubmit = async () => {
    try {
      setIsHandovering(true);
      await api.post(\`/contractor-work-orders/\${workOrder._id}/handover\`, {
        newContractorId: handoverContractorId,
        materialDisposition: 'TRANSFER_TO_NEW_CONTRACTOR'
      });
      toast.success('Handover successful');
      setIsHandoverModalOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to complete handover');
    } finally {
      setIsHandovering(false);
    }
  };`;

const newHandle = `const handleHandoverSubmit = async () => {
    try {
      setIsHandovering(true);
      const assignmentsArr = Object.entries(handoverAssignments).map(([idx, cId]) => ({
        itemIndex: Number(idx),
        contractorId: cId
      }));
      
      await api.post(\`/contractor-work-orders/\${workOrder._id}/handover\`, {
        assignments: assignmentsArr,
        materialDisposition: 'TRANSFER_TO_NEW_CONTRACTOR'
      });
      toast.success('Handover successful');
      setIsHandoverModalOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to complete handover');
    } finally {
      setIsHandovering(false);
    }
  };
  
  const handleAssignmentChange = (index: number, cId: string) => {
    setHandoverAssignments(prev => ({ ...prev, [index]: cId }));
  };
  
  const handleAssignAll = (cId: string) => {
    const newAss: Record<number, string> = {};
    if (workOrder?.items) {
       workOrder.items.forEach((_: any, idx: number) => {
         newAss[idx] = cId;
       });
    }
    setHandoverAssignments(newAss);
  };
  `;

code = code.replace(oldHandle, newHandle);

// 3. Replace the Modal body
const oldModal = /{isHandoverModalOpen && \([\s\S]*?Confirm Handover'\}\n\s*<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\)}/m;

const newModal = `{isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-indigo-600" /> Handover to New Contractors
              </h3>
              <button onClick={() => setIsHandoverModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800">
                <span className="font-bold">Note:</span> The old contractor's unerected liability will be calculated and pushed to a Draft Return. 
                Any assigned items will generate separate Work Orders (with the same WO Number) and Demand Notes for the selected contractors.
                Unassigned items will be abandoned.
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <span className="text-sm font-semibold text-slate-700">Quick Assign All:</span>
                 <select
                    onChange={(e) => handleAssignAll(e.target.value)}
                    className="h-9 bg-white border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:border-indigo-500"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select Contractor to assign to all --</option>
                    {contractors.map((c) => (
                      <option key={c._id} value={c._id}>{c.dynamicData?.companyName || 'Unknown'}</option>
                    ))}
                 </select>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-left">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Temp Code</th>
                      <th className="px-4 py-2 font-semibold">Activity</th>
                      <th className="px-4 py-2 font-semibold">Description</th>
                      <th className="px-4 py-2 font-semibold w-1/3">Assign To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workOrder.items?.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{item.tempCode || 'N/A'}</td>
                        <td className="px-4 py-2 text-slate-700 font-medium">{item.activity || 'N/A'}</td>
                        <td className="px-4 py-2 text-slate-500 text-xs truncate max-w-[200px]" title={item.description}>{item.description || 'N/A'}</td>
                        <td className="px-4 py-2">
                           <select
                              value={handoverAssignments[index] || ''}
                              onChange={(e) => handleAssignmentChange(index, e.target.value)}
                              className="w-full h-8 bg-white border border-slate-300 rounded-md px-2 text-xs focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">-- Unassigned (Abandon) --</option>
                              {contractors.map((c) => (
                                <option key={c._id} value={c._id}>{c.dynamicData?.companyName || 'Unknown'}</option>
                              ))}
                           </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsHandoverModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleHandoverSubmit}
                disabled={isHandovering || Object.keys(handoverAssignments).length === 0}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isHandovering ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Confirm Handover'}
              </button>
            </div>
          </div>
        </div>
      )}`;

code = code.replace(oldModal, newModal);
fs.writeFileSync(path, code);
console.log("Updated frontend logic");
