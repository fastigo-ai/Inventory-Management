const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'frontend/src/app/purchases/invoices/page.tsx');
let lines = fs.readFileSync(pagePath, 'utf8').replace(/\r/g, '').split('\n');

let newLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (line.includes('import { getPurchaseInvoices, exportPurchaseInvoicesToCsv, getUniqueVendors } from "@/features/purchases/api/purchases.api";')) {
    newLines.push('import { getPurchaseInvoices, exportPurchaseInvoicesToCsv, getUniqueVendors, getPIItemSummary } from "@/features/purchases/api/purchases.api";');
    newLines.push('import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from "recharts";');
    continue;
  }

  if (line.includes('const [isExporting, setIsExporting] = useState(false);')) {
    newLines.push(line);
    newLines.push(`  // Tabs & Analytics State
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summarySearch, setSummarySearch] = useState("");`);
    continue;
  }

  if (line.includes('  useEffect(() => {') && lines[i+1]?.includes('getUniqueVendors().then') && !newLines.find(l => l.includes('fetchSummaryData'))) {
    newLines.push(`  const fetchSummaryData = async () => {
    try {
      setIsSummaryLoading(true);
      const res = await getPIItemSummary();
      setSummaryData(res.data || []);
    } catch (err) {
      console.error("Failed to fetch summary data", err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics' && summaryData.length === 0) {
      fetchSummaryData();
    }
  }, [activeTab]);
`);
    newLines.push(line);
    continue;
  }

  if (line.includes('{/* Main Content Area */}')) {
    newLines.push(line);
    newLines.push(`      <div className="px-6 border-b border-slate-200 bg-white flex space-x-6 shrink-0">
        <button
          onClick={() => setActiveTab('list')}
          className={\`pb-3 text-[13px] font-medium border-b-2 transition-colors \${activeTab === 'list' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
        >
          Invoice List
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={\`pb-3 text-[13px] font-medium border-b-2 transition-colors \${activeTab === 'analytics' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
        >
          Analytics & Item Matrix
        </button>
      </div>`);
    continue;
  }

  if (line.includes('<div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col space-y-5 bg-[#fcfcfc]">')) {
    newLines.push(line);
    newLines.push(`        {activeTab === 'list' && (
          <>`);
    continue;
  }

  if (line === '      <PurchaseInvoiceImportModal ' && lines[i-1] === '' && lines[i-2] === '      </div>' && lines[i-3] === '        </div>') {
    // Remove the two closing divs and empty line, but keep one for the table area!
    newLines.pop(); // removes empty line
    newLines.pop(); // removes the </div> for div.flex-1
    // KEEP the </div> for the table area
    
    // Now insert the closure of activeTab === 'list'
    newLines.push(`          </>
        )}
        
        {activeTab === 'analytics' && (
          <div className="flex flex-col space-y-6 pt-4 h-full">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-[14px] font-semibold text-slate-800 mb-4">Top 15 Items by Purchase Quantity</h2>
              <div className="h-[300px] w-full">
                {isSummaryLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryData.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="tempCode" tick={{fontSize: 10}} tickMargin={10} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(val) => new Intl.NumberFormat('en-IN').format(val)} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="piQuantity" name="Total PI Quantity" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="irQuantity" name="Store Inward Done" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden min-h-[400px]">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="relative w-[300px]">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Temp Code or Item Name..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-4 w-[15%]">Temp Code</th>
                      <th className="px-5 py-4 w-[40%]">Item Name</th>
                      <th className="px-5 py-4 text-right">Total PI Quantity</th>
                      <th className="px-5 py-4 text-right">Inward Done (IR)</th>
                      <th className="px-5 py-4 text-right text-blue-600">Pending IR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isSummaryLoading ? (
                      <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr>
                    ) : summaryData.filter(item => 
                        (item.tempCode?.toLowerCase() || '').includes(summarySearch.toLowerCase()) || 
                        (item.itemName?.toLowerCase() || '').includes(summarySearch.toLowerCase())
                      ).length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-slate-500">No items found matching your search.</td></tr>
                    ) : (
                      summaryData
                        .filter(item => 
                          (item.tempCode?.toLowerCase() || '').includes(summarySearch.toLowerCase()) || 
                          (item.itemName?.toLowerCase() || '').includes(summarySearch.toLowerCase())
                        )
                        .map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-700">{item.tempCode || '-'}</td>
                          <td className="px-5 py-3 text-[12px] text-slate-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]" title={item.itemName}>{item.itemName || '-'}</td>
                          <td className="px-5 py-3 text-right font-medium text-slate-700">{new Intl.NumberFormat('en-IN').format(item.piQuantity || 0)}</td>
                          <td className="px-5 py-3 text-right font-medium text-emerald-600">{new Intl.NumberFormat('en-IN').format(item.irQuantity || 0)}</td>
                          <td className="px-5 py-3 text-right font-bold text-blue-600">{new Intl.NumberFormat('en-IN').format(Math.max(0, (item.piQuantity || 0) - (item.irQuantity || 0)))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

`); // Added the missing </div> to close div.flex-1
    newLines.push(line);
    continue;
  }

  newLines.push(line);
}

fs.writeFileSync(pagePath, newLines.join('\n'));
console.log('Successfully rewrote page.tsx');
