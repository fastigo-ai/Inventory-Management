const fs = require('fs');

function processPage(file, entityName, apiModule) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Add Download and Trash2 to lucide-react imports if not present
  if (!content.includes('Trash2')) {
    content = content.replace(/import \{ (.*) \} from "lucide-react";/, "import { $1, Trash2, Download } from \"lucide-react\";");
  }

  // Add delete API import
  const deleteApiName = `delete${entityName}`;
  const getApiName = `get${entityName}s`;
  if (!content.includes(deleteApiName)) {
    content = content.replace(new RegExp(`import \\{ ${getApiName} \\} from "@/features/site-portal/api/${apiModule}";`), `import { ${getApiName}, ${deleteApiName} } from "@/features/site-portal/api/${apiModule}";`);
  }

  // Inject export and delete functions before useClientTable
  const functionsBlock = `
  const exportData = () => {
    const headers = ['Number', 'Date', 'Contractor', 'Package', 'Circle', 'Activity', 'LOA Sr No', 'Temp Code', 'Claimed Qty', 'Approved Qty', 'Rate', 'Amount', 'Status'];
    const rows: any[] = [];
    entries.forEach((entry: any) => {
      const contractor = entry.contractorId?.name || entry.contractorId?.vendorName || entry.contractorId?.dynamicData?.companyName || 'Unknown';
      const date = new Date(entry.date).toLocaleDateString();
      if (entry.items && entry.items.length > 0) {
        entry.items.forEach((item: any) => {
          rows.push([
            entry.jmcNumber || entry.wipNumber || '',
            date,
            contractor,
            entry.package || '',
            entry.circle || '',
            item.activity || '',
            item.loaSrNo || item.loaSerialNo || '',
            item.tempCode || '',
            item.claimedQty || 0,
            item.approvedQty || 0,
            item.rate || 0,
            item.amount || 0,
            entry.status || ''
          ]);
        });
      } else {
          rows.push([
            entry.jmcNumber || entry.wipNumber || '',
            date,
            contractor,
            entry.package || '',
            entry.circle || '',
            '', '', '', 0, 0, 0, 0, entry.status || ''
          ]);
      }
    });

    const csvContent = headers.join(",") + "\\n" + rows.map(e => e.map(cell => \`"\${String(cell).replace(/"/g, '""')}"\`).join(",")).join("\\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "${entityName}_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await ${deleteApiName}(id);
        ${getApiName === 'getJmcs' ? 'fetchJmcs()' : (getApiName === 'getWips' ? 'fetchWips()' : 'fetchWipRequireds()')};
      } catch (error) {
        console.error(error);
        alert('Failed to delete.');
      }
    }
  };
`;
  
  if (!content.includes('exportData = ()')) {
    content = content.replace(/const \{\s*paginatedData,/, functionsBlock + '\n  const {\n    paginatedData,');
  }

  // Inject export button next to Bulk Upload JMC
  if (!content.includes('Export Data')) {
    content = content.replace(/<Button variant="outline" onClick=\{([^}]+)\}>\s*<FileText className="mr-2 h-4 w-4" \/> Bulk Upload/g, 
    `<Button variant="outline" onClick={exportData} className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">\n              <Download className="mr-2 h-4 w-4" /> Export Data\n            </Button>\n            <Button variant="outline" onClick={$1}>\n              <FileText className="mr-2 h-4 w-4" /> Bulk Upload`);
  }

  // Inject Actions header
  if (!content.includes('<th>Actions</th>') && !content.includes('<th className="px-6 py-4">Actions</th>')) {
    content = content.replace(/<th className="px-6 py-4">Status<\/th>\s*<\/tr>/, '<th className="px-6 py-4">Status</th>\n                    <th className="px-6 py-4 text-right">Actions</th>\n                  </tr>');
  }

  // Inject Delete button in table rows
  if (!content.includes('onClick={(e) => handleDelete(e, entry._id)}')) {
    content = content.replace(/<td className="px-6 py-4">\s*<span className=\{`px-2\.5 py-1[^>]+>\s*\{entry\.status\}\s*<\/span>\s*<\/td>\s*<\/tr>/g, 
    `<td className="px-6 py-4">\n                          <span className={\`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide \${entry.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : entry.status === 'Submitted' ? 'bg-blue-100 text-blue-700' : entry.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}\`}>\n                            {entry.status}\n                          </span>\n                        </td>\n                        <td className="px-6 py-4 text-right">\n                          <button onClick={(e) => handleDelete(e, entry._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">\n                            <Trash2 className="w-4 h-4" />\n                          </button>\n                        </td>\n                      </tr>`);
  }

  // Adjust colSpan for loading/empty states
  content = content.replace(/colSpan=\{8\}/g, 'colSpan={9}');

  fs.writeFileSync(file, content);
}

processPage('/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/jmc-register/page.tsx', 'Jmc', 'jmc.api');
processPage('/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-register/page.tsx', 'Wip', 'wip.api');
processPage('/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-required/page.tsx', 'WipRequired', 'wipRequired.api');

console.log("Added Export and Delete CRUD operations to site portal list pages.");
