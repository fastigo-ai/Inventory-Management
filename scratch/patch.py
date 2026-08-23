import sys

with open('frontend/src/app/di/page.tsx', 'r') as f:
    content = f.read()

tabs_ui = """
        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'list' ? 'border-[#0076f2] text-[#0076f2]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('list')}
          >
            DI List
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'matrix' ? 'border-[#0076f2] text-[#0076f2]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('matrix')}
          >
            Analytics & Item Matrix
          </button>
        </div>
"""

content = content.replace(
    '<DIImportModal',
    tabs_ui + '\n        <DIImportModal'
)

content = content.replace(
    '{/* Business Insights Dashboard */}',
    '{activeTab === \'list\' && (<>\n        {/* Business Insights Dashboard */}'
)

matrix_ui = """
        {/* Matrix View */}
        {activeTab === 'matrix' && (
          <div className="flex flex-col gap-6">
            {/* Matrix Filters & Toggles */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end justify-between">
              <div className="flex gap-4 flex-wrap">
                <div className="w-[200px]">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Search</label>
                  <input type="text" placeholder="Search Item, LOA, TempCode..." value={matrixSearch} onChange={e => setMatrixSearch(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Package</label>
                  <input type="text" placeholder="e.g. Package 1" value={matrixPackage} onChange={e => setMatrixPackage(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Circle</label>
                  <input type="text" placeholder="e.g. Solan" value={matrixCircle} onChange={e => setMatrixCircle(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={showSolan} onChange={e => setShowSolan(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" /> Solan
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={showNahan} onChange={e => setShowNahan(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" /> Nahan
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={showRampur} onChange={e => setShowRampur(e.target.checked)} className="rounded text-amber-600 focus:ring-amber-500" /> Rampur
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={showRohru} onChange={e => setShowRohru(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" /> Rohru
                </label>
              </div>
            </div>

            {/* Matrix Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">Top 15 Items by DI Quantity</h3>
              {matrixLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">Loading chart...</div>
              ) : matrixData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={matrixData.slice(0, 15)} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="tempCode" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    {showSolan && <Bar dataKey="solanQty" name="Solan" stackId="a" fill="#3b82f6" />}
                    {showNahan && <Bar dataKey="nahanQty" name="Nahan" stackId="a" fill="#10b981" />}
                    {showRampur && <Bar dataKey="rampurQty" name="Rampur" stackId="a" fill="#f59e0b" />}
                    {showRohru && <Bar dataKey="rohruQty" name="Rohru" stackId="a" fill="#8b5cf6" />}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">No data available</div>
              )}
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full min-w-[800px] text-sm text-left relative">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap bg-slate-50 sticky left-0 z-20 shadow-sm">LOA Serial No</th>
                      <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Temp Code</th>
                      <th className="px-4 py-3 min-w-[200px] bg-slate-50">Item Name</th>
                      {showSolan && <th className="px-4 py-3 text-right text-blue-700 bg-blue-50/50">Solan DI Qty</th>}
                      {showNahan && <th className="px-4 py-3 text-right text-emerald-700 bg-emerald-50/50">Nahan DI Qty</th>}
                      {showRampur && <th className="px-4 py-3 text-right text-amber-700 bg-amber-50/50">Rampur DI Qty</th>}
                      {showRohru && <th className="px-4 py-3 text-right text-purple-700 bg-purple-50/50">Rohru DI Qty</th>}
                      <th className="px-4 py-3 text-right font-bold text-slate-700 bg-slate-100">Total DI Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixLoading ? (
                      <tr><td colSpan={10} className="p-8 text-center text-slate-500">Loading matrix...</td></tr>
                    ) : matrixData.length === 0 ? (
                      <tr><td colSpan={10} className="p-8 text-center text-slate-500">No matching items found</td></tr>
                    ) : (
                      matrixData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 bg-white sticky left-0 shadow-sm">{row.loaSerialNo || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.tempCode || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 line-clamp-1" title={row.itemName}>{row.itemName || '-'}</div>
                            {row.description && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1" title={row.description}>{row.description}</div>}
                          </td>
                          {showSolan && <td className="px-4 py-3 text-right font-semibold text-blue-700 bg-blue-50/10">{row.solanQty > 0 ? row.solanQty.toLocaleString('en-IN') : '-'}</td>}
                          {showNahan && <td className="px-4 py-3 text-right font-semibold text-emerald-700 bg-emerald-50/10">{row.nahanQty > 0 ? row.nahanQty.toLocaleString('en-IN') : '-'}</td>}
                          {showRampur && <td className="px-4 py-3 text-right font-semibold text-amber-700 bg-amber-50/10">{row.rampurQty > 0 ? row.rampurQty.toLocaleString('en-IN') : '-'}</td>}
                          {showRohru && <td className="px-4 py-3 text-right font-semibold text-purple-700 bg-purple-50/10">{row.rohruQty > 0 ? row.rohruQty.toLocaleString('en-IN') : '-'}</td>}
                          <td className="px-4 py-3 text-right font-bold text-slate-800 bg-slate-50/50">{row.totalQty > 0 ? row.totalQty.toLocaleString('en-IN') : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
"""

content = content.replace(
    '</div>\n      </div>\n    </div>\n  );\n}',
    '</>)}\n\n' + matrix_ui + '\n      </div>\n    </div>\n  );\n}'
)

with open('frontend/src/app/di/page.tsx', 'w') as f:
    f.write(content)

print('Done!')
