const fs = require('fs');

const path = 'frontend/src/app/site-portal/demand-notes/new/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Update formData state
content = content.replace(
  /division: string;\s*subDivision: string;\s*location: string;/,
  `drawingNumber: string;\n    division?: string;\n    subDivision?: string;\n    location?: string;`
);

content = content.replace(
  /division: '',\s*subDivision: '',\s*location: '',/,
  `drawingNumber: '', division: '', subDivision: '', location: '',`
);

// 2. Fetching Work Order
content = content.replace(
  /division: wo\.division \|\| '',\s*subDivision: wo\.subDivision \|\| '',\s*location: wo\.location \|\| '',/,
  `// Select first drawing by default if available\n          drawingNumber: (wo.drawings && wo.drawings.length > 0) ? wo.drawings[0].drawingNumber : '',\n          division: (wo.drawings && wo.drawings.length > 0) ? wo.drawings[0].division : '',\n          subDivision: (wo.drawings && wo.drawings.length > 0) ? wo.drawings[0].subDivision : '',\n          location: (wo.drawings && wo.drawings.length > 0) ? wo.drawings[0].location : '',`
);

// 3. Keep WO state to read drawings from
content = content.replace(
  /const \[contractorsList, setContractorsList\] = useState<any\[\]>\(\[\]\);/,
  `const [contractorsList, setContractorsList] = useState<any[]>([]);\n  const [currentWorkOrder, setCurrentWorkOrder] = useState<any>(null);`
);

content = content.replace(
  /const response = await api\.get\(\`\/contractor-work-orders\/\$\{workOrderId\}\`\);/,
  `const response = await api.get(\`/contractor-work-orders/\${workOrderId}\`);\n        setCurrentWorkOrder(response.data.data);`
);

// 4. Replace UI inputs
const oldUI = `          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Division</label>
            <Input value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Sub Division</label>
            <Input value={formData.subDivision} onChange={e => setFormData({...formData, subDivision: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Location</label>
            <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
          </div>`;

const newUI = `          <div className="md:col-span-1 lg:col-span-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Drawing Number <span className="text-red-500">*</span></label>
            {currentWorkOrder?.drawings ? (
              <select
                value={formData.drawingNumber}
                onChange={e => {
                  const drawing = currentWorkOrder.drawings.find((d: any) => d.drawingNumber === e.target.value);
                  setFormData({
                    ...formData, 
                    drawingNumber: e.target.value,
                    division: drawing?.division || '',
                    subDivision: drawing?.subDivision || '',
                    location: drawing?.location || ''
                  });
                }}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                required
              >
                <option value="">Select Drawing</option>
                {currentWorkOrder.drawings.map((d: any) => (
                  <option key={d.drawingNumber} value={d.drawingNumber}>{d.drawingNumber}</option>
                ))}
              </select>
            ) : (
              <Input value={formData.drawingNumber} onChange={e => setFormData({...formData, drawingNumber: e.target.value})} required />
            )}
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Division</label>
            <Input value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} disabled={!!currentWorkOrder?.drawings} />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Sub Division</label>
            <Input value={formData.subDivision} onChange={e => setFormData({...formData, subDivision: e.target.value})} disabled={!!currentWorkOrder?.drawings} />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Location</label>
            <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} disabled={!!currentWorkOrder?.drawings} />
          </div>`;

content = content.replace(oldUI, newUI);

// 5. Submit validations
content = content.replace(
  /if \(\!formData\.contractorName\)/,
  `if (!formData.contractorName || !formData.drawingNumber)`
);
content = content.replace(
  /toast\.error\('Please select a contractor'\);/,
  `toast.error('Please select a contractor and drawing number');`
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Patched Demand Note new page');
