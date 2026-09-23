const fs = require('fs');
const path = './frontend/src/app/ho-billing/contractor-work-orders/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const modalCode = `
      {/* Handover Modal */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-indigo-600" /> Handover to New Contractor
              </h3>
              <button onClick={() => setIsHandoverModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800">
                <span className="font-bold">Note:</span> This will calculate the old contractor's liability and generate a Draft Return for them, along with a Draft Demand Note for the new contractor for the unerected material.
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select New Contractor</label>
                <select
                  value={handoverContractorId}
                  onChange={(e) => setHandoverContractorId(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Select Contractor --</option>
                  {contractors.map((c) => (
                    <option key={c._id} value={c._id}>{c.dynamicData?.companyName || 'Unknown'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Material Disposition</label>
                <select
                  disabled
                  className="w-full h-11 bg-slate-100 border border-slate-200 rounded-lg px-3 text-sm text-slate-500 opacity-70"
                >
                  <option>Transfer unerected material to new contractor</option>
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsHandoverModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleHandoverSubmit}
                disabled={isHandovering || !handoverContractorId}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isHandovering ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Confirm Handover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

code = code.replace(
  "    </div>\n  );\n}",
  modalCode + "\n}"
);

fs.writeFileSync(path, code);
console.log("Added modal code");
