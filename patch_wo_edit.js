const fs = require('fs');
const path = 'frontend/src/app/ho-billing/contractor-work-orders/[id]/edit/page.tsx';
if (!fs.existsSync(path)) {
  console.log('Edit page does not exist. Skipping.');
  process.exit(0);
}

let content = fs.readFileSync(path, 'utf-8');

// 1. Update formData state
content = content.replace(
  /division: '',\s*subDivision: '',\s*location: '',/,
  `drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }],`
);

// Populate formData correctly on fetch
content = content.replace(
  /division: data\.division \|\| '',\s*subDivision: data\.subDivision \|\| '',\s*location: data\.location \|\| '',/,
  `drawings: data.drawings && data.drawings.length > 0 ? data.drawings : [{ drawingNumber: '', division: '', subDivision: '', location: '' }],`
);

// 2. Add drawing handlers
content = content.replace(
  /const \[currentActivityInput, setCurrentActivityInput\] = useState\(''\);/,
  `const [currentActivityInput, setCurrentActivityInput] = useState('');

  const addDrawing = () => {
    setFormData(prev => ({ ...prev, drawings: [...prev.drawings, { drawingNumber: '', division: '', subDivision: '', location: '' }] }));
  };

  const removeDrawing = (index: number) => {
    if (formData.drawings.length === 1) return;
    setFormData(prev => ({ ...prev, drawings: prev.drawings.filter((_, i) => i !== index) }));
  };

  const updateDrawing = (index: number, field: string, value: string) => {
    const newDrawings = [...formData.drawings];
    newDrawings[index] = { ...newDrawings[index], [field]: value };
    setFormData({ ...formData, drawings: newDrawings });
  };`
);

// 3. Replace old UI
const oldUI = `          <div>
            <label className="block text-[13px] font-semibold text-slate-800 mb-1">Division <span className="text-red-500">*</span></label>
            <select
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
              disabled={!formData.circle || availableDivisions.length === 0}
            >
              <option value="">Select Division</option>
              {availableDivisions.map(div => <option key={div} value={div}>{div}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-800 mb-1">Sub Division</label>
            <input
              type="text"
              value={formData.subDivision}
              onChange={(e) => setFormData({ ...formData, subDivision: e.target.value })}
              placeholder="Enter sub division manually"
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-800 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter location manually"
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>`;

const newUI = `          <div className="md:col-span-3">
            <label className="block text-[13px] font-semibold text-slate-800 mb-2">Drawings <span className="text-red-500">*</span></label>
            {formData.drawings.map((drawing, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-start border border-slate-200 p-3 rounded-md bg-slate-50">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Drawing Number <span className="text-red-500">*</span></label>
                    <input type="text" value={drawing.drawingNumber} onChange={e => updateDrawing(idx, 'drawingNumber', e.target.value)} placeholder="e.g. DWG-001" className="w-full px-2 py-1.5 text-sm rounded border border-slate-200" required />
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Division</label>
                    <select value={drawing.division} onChange={e => updateDrawing(idx, 'division', e.target.value)} className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 bg-white">
                      <option value="">Select Division</option>
                      {availableDivisions.map(div => <option key={div} value={div}>{div}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Sub Division</label>
                    <input type="text" value={drawing.subDivision} onChange={e => updateDrawing(idx, 'subDivision', e.target.value)} placeholder="Sub Div" className="w-full px-2 py-1.5 text-sm rounded border border-slate-200" />
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Location</label>
                    <input type="text" value={drawing.location} onChange={e => updateDrawing(idx, 'location', e.target.value)} placeholder="Location" className="w-full px-2 py-1.5 text-sm rounded border border-slate-200" />
                  </div>
                </div>
                {formData.drawings.length > 1 && (
                  <button type="button" onClick={() => removeDrawing(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded mt-5"><X size={16}/></button>
                )}
              </div>
            ))}
            <button type="button" onClick={addDrawing} className="text-indigo-600 text-[13px] font-medium flex items-center gap-1 mt-1 hover:underline"><Plus size={14} /> Add Another Drawing</button>
          </div>`;

content = content.replace(oldUI, newUI);

// 4. Submit validations
content = content.replace(
  /if \(\!formData\.package \|\| \!formData\.circle \|\| \!formData\.contractorId \|\| \!formData\.division\)/,
  `if (!formData.package || !formData.circle || !formData.contractorId || formData.drawings.some(d => !d.drawingNumber))`
);
content = content.replace(
  /toast\.error\('Please fill in all required fields \(Package, Circle, Contractor, Division\)'\);/,
  `toast.error('Please fill in all required fields including Drawing Numbers');`
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Patched edit/page.tsx');
