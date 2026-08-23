const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/app/di/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add new imports
if (!content.includes('getDIItemSummary')) {
  content = content.replace(
    'import { getDIs, getDIInsights } from "@/features/di/api/di.api";',
    'import { getDIs, getDIInsights, getDIItemSummary } from "@/features/di/api/di.api";'
  );
}

// Add state variables for tabs and matrix
const stateInsert = `
  const [activeTab, setActiveTab] = useState<'list' | 'matrix'>('list');
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixPackage, setMatrixPackage] = useState("");
  const [matrixCircle, setMatrixCircle] = useState("");
  
  const [showSolan, setShowSolan] = useState(true);
  const [showNahan, setShowNahan] = useState(true);
  const [showRampur, setShowRampur] = useState(true);
  const [showRohru, setShowRohru] = useState(true);
`;

content = content.replace(
  'const [showInsights, setShowInsights] = useState(true);',
  'const [showInsights, setShowInsights] = useState(true);' + stateInsert
);

// Add fetchMatrixData function
const fetchMatrixInsert = `
  const fetchMatrixData = () => {
    setMatrixLoading(true);
    getDIItemSummary({ search: matrixSearch, package: matrixPackage, circle: matrixCircle })
      .then(res => {
        if (res.success && res.data) {
          setMatrixData(res.data);
        }
      })
      .finally(() => setMatrixLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'matrix') {
      fetchMatrixData();
    }
  }, [activeTab, matrixSearch, matrixPackage, matrixCircle]);
`;

content = content.replace(
  'useEffect(() => {',
  fetchMatrixInsert + '\n  useEffect(() => {'
);

// Add Tabs UI below header
const tabsUI = `
        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            className={\`px-6 py-3 font-medium text-sm transition-colors border-b-2 \${activeTab === 'list' ? 'border-[#0076f2] text-[#0076f2]' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
            onClick={() => setActiveTab('list')}
          >
            DI List
          </button>
          <button
            className={\`px-6 py-3 font-medium text-sm transition-colors border-b-2 \${activeTab === 'matrix' ? 'border-[#0076f2] text-[#0076f2]' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
            onClick={() => setActiveTab('matrix')}
          >
            Analytics & Item Matrix
          </button>
        </div>
`;

content = content.replace(
  '<DIImportModal',
  tabsUI + '\n        <DIImportModal'
);

// Wrap existing List view in activeTab === 'list'
content = content.replace(
  '{/* Business Insights Dashboard */}',
  '{activeTab === "list" && (<>\n        {/* Business Insights Dashboard */}'
);

content = content.replace(
  '</div>\n      </div>\n    </div>\n  );\n}',
  '</>)}\n\n' + `        {/* Matrix View */}\n        {activeTab === 'matrix' && (\n          <div className="flex flex-col gap-6">\n            {/* Matrix Filters & Toggles */}\n            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end justify-between">\n              <div className="flex gap-4 flex-wrap">\n                <div className="w-[200px]">\n                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Search</label>\n                  <input type="text" placeholder="Search Item, LOA, TempCode..." value={matrixSearch} onChange={e => setMatrixSearch(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500" />\n                </div>\n                <div className="w-[150px]">\n                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Package</label>\n                  <input type="text" placeholder="e.g. Package 1" value={matrixPackage} onChange={e => setMatrixPackage(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500" />\n                </div>\n              </div>\n              \n              <div className="flex gap-4">\n                <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">\n                  <input type="checkbox" checked={showSolan} onChange={e => setShowSolan(e.target.checked)} className="rounded text-blue-600" /> Solan\n                </label>\n                <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">\n                  <input type="checkbox" checked={showNahan} onChange={e => setShowNahan(e.target.checked)} className="rounded text-blue-600" /> Nahan\n                </label>\n                <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">\n                  <input type="checkbox" checked={showRampur} onChange={e => setShowRampur(e.target.checked)} className="rounded text-blue-600" /> Rampur\n                </label>\n                <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">\n                  <input type="checkbox" checked={showRohru} onChange={e => setShowRohru(e.target.checked)} className="rounded text-blue-600" /> Rohru\n                </label>\n              </div>\n            </div>\n\n            {/* Matrix Chart */}\n            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[300px]">\n              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">Top 15 Items by DI Quantity</h3>\n              {matrixLoading ? (\n                <div className="flex-1 flex items-center justify-center text-slate-500">Loading chart...</div>\n              ) : matrixData.length > 0 ? (\n                <ResponsiveContainer width="100%" height="100%">\n                  <BarChart data={matrixData.slice(0, 15)} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>\n                    <CartesianGrid strokeDasharray="3 3" vertical={false} />\n                    <XAxis dataKey="tempCode" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={40} />\n                    <YAxis tick={{ fontSize: 11 }} />\n                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />\n                    {showSolan && <Bar dataKey="solanQty" name="Solan" stackId="a" fill="#3b82f6" />}\n                    {showNahan && <Bar dataKey="nahanQty" name="Nahan" stackId="a" fill="#10b981" />}\n                    {showRampur && <Bar dataKey="rampurQty" name="Rampur" stackId="a" fill="#f59e0b" />}\n                    {showRohru && <Bar dataKey="rohruQty" name="Rohru" stackId="a" fill="#8b5cf6" />}\n                  </BarChart>\n                </ResponsiveContainer>\n              ) : (\n                <div className="flex-1 flex items-center justify-center text-slate-400">No data available</div>\n              )}\n            </div>\n\n            {/* Matrix Table */}\n            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">\n              <div className="overflow-x-auto max-h-[600px]">\n                <table className="w-full min-w-[800px] text-sm text-left relative">\n                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">\n                    <tr>\n                      <th className="px-4 py-3 whitespace-nowrap bg-slate-50 sticky left-0 z-20">LOA Serial No</th>\n                      <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Temp Code</th>\n                      <th className="px-4 py-3 min-w-[200px] bg-slate-50">Item Name</th>\n                      {showSolan && <th className="px-4 py-3 text-right text-blue-700 bg-blue-50/50">Solan</th>}\n                      {showNahan && <th className="px-4 py-3 text-right text-emerald-700 bg-emerald-50/50">Nahan</th>}\n                      {showRampur && <th className="px-4 py-3 text-right text-amber-700 bg-amber-50/50">Rampur</th>}\n                      {showRohru && <th className="px-4 py-3 text-right text-purple-700 bg-purple-50/50">Rohru</th>}\n                      <th className="px-4 py-3 text-right font-bold text-slate-700 bg-slate-100">Total</th>\n                    </tr>\n                  </thead>\n                  <tbody className="divide-y divide-slate-100">\n                    {matrixLoading ? (\n                      <tr><td colSpan={10} className="p-8 text-center text-slate-500">Loading matrix...</td></tr>\n                    ) : matrixData.length === 0 ? (\n                      <tr><td colSpan={10} className="p-8 text-center text-slate-500">No matching items found</td></tr>\n                    ) : (\n                      matrixData.map((row, idx) => (\n                        <tr key={idx} className="hover:bg-slate-50 transition-colors">\n                          <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 bg-white sticky left-0">{row.loaSerialNo || '-'}</td>\n                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.tempCode || '-'}</td>\n                          <td className="px-4 py-3">\n                            <div className="font-medium text-slate-800 line-clamp-1" title={row.itemName}>{row.itemName || '-'}</div>\n                            {row.description && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1" title={row.description}>{row.description}</div>}\n                          </td>\n                          {showSolan && <td className="px-4 py-3 text-right font-semibold text-blue-700 bg-blue-50/10">{row.solanQty > 0 ? row.solanQty.toLocaleString('en-IN') : '-'}</td>}\n                          {showNahan && <td className="px-4 py-3 text-right font-semibold text-emerald-700 bg-emerald-50/10">{row.nahanQty > 0 ? row.nahanQty.toLocaleString('en-IN') : '-'}</td>}\n                          {showRampur && <td className="px-4 py-3 text-right font-semibold text-amber-700 bg-amber-50/10">{row.rampurQty > 0 ? row.rampurQty.toLocaleString('en-IN') : '-'}</td>}\n                          {showRohru && <td className="px-4 py-3 text-right font-semibold text-purple-700 bg-purple-50/10">{row.rohruQty > 0 ? row.rohruQty.toLocaleString('en-IN') : '-'}</td>}\n                          <td className="px-4 py-3 text-right font-bold text-slate-800 bg-slate-50/50">{row.totalQty > 0 ? row.totalQty.toLocaleString('en-IN') : '-'}</td>\n                        </tr>\n                      ))\n                    )}\n                  </tbody>\n                </table>\n              </div>\n            </div>\n          </div>\n        )}\n      </div>\n    </div>\n  );\n}`
);

fs.writeFileSync(filePath, content);
console.log('Patched DI Page successfully!');
