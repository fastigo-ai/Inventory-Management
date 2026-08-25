const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add jsPDF and autoTable imports
if (!content.includes("import jsPDF from 'jspdf';")) {
  content = content.replace(
    "import { getItemMatrixSummary } from '@/features/reports/api/reports.api';",
    "import { getItemMatrixSummary } from '@/features/reports/api/reports.api';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';"
  );
}

// 2. Add handleExportPDF function
const exportPDFCode = `
  const handleExportPDF = () => {
    if (data.length === 0) return alert('No data to export');

    // Create a very wide PDF to accommodate all 68+ columns (Width: 2000mm, Height: A4 297mm)
    const doc = new jsPDF({ orientation: 'landscape', format: [2000, 297] });
    
    doc.setFontSize(20);
    doc.text(\`Item Summary Report (Multi-Circle LOA / BOM Matrix)\`, 14, 20);
    doc.setFontSize(12);
    doc.text(\`Generated on: \${new Date().toLocaleDateString()}\`, 14, 30);
    
    // We will build the headers dynamically based on what is shown in CSV
    const headers = [
      'Sr. No.', 'LOA Sr. No.', 'Temp Code', 'Item Name', 'Package', 'Circle',
      'Solan LOA Qty', 'Solan BOM Qty', 'Nahan LOA Qty', 'Nahan BOM Qty', 'Rampur LOA Qty', 'Rampur BOM Qty', 'Rohru LOA Qty', 'Rohru BOM Qty',
      'Total Dispatched Solan', 'Total Dispatched Nahan', 'Total Dispatched Rampur', 'Total Dispatched Rohru',
      'Total Inward (IR) Solan', 'Total Inward (IR) Nahan', 'Total Inward (IR) Rampur', 'Total Inward (IR) Rohru',
      'Total MRHOV Solan', 'Total MRHOV Nahan', 'Total MRHOV Rampur', 'Total MRHOV Rohru',
      'Total MIN/Issue Solan', 'Total MIN/Issue Nahan', 'Total MIN/Issue Rampur', 'Total MIN/Issue Rohru',
      'Total JMC Solan', 'Total JMC Nahan', 'Total JMC Rampur', 'Total JMC Rohru',
      'Total Supply Billed Solan', 'Total Supply Billed Nahan', 'Total Supply Billed Rampur', 'Total Supply Billed Rohru',
      'Total Erection Billed Solan', 'Total Erection Billed Nahan', 'Total Erection Billed Rampur', 'Total Erection Billed Rohru',
      ...['SOLAN', 'NAHAN', 'RAMPUR', 'ROHRU'].flatMap(c => [
        \`Bal for DI (\${c})\`, \`Bal for Dispatch (\${c})\`,
        \`Bal for IR (\${c})\`, \`Bal for MRHOv (\${c})\`, \`Bal for JMC (\${c})\`,
        \`Bal for Supply (\${c})\`, \`Bal for Erection (\${c})\`
      ])
    ];

    const rows = data.map((r, i) => {
      const itemCirc = String(r.circle || '').toLowerCase();
      const cv = (circ: string, val: any) => !itemCirc.includes(circ) ? '-' : (val?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00');

      return [
        r.srNo || (i + 1),
        r.loaSerialNo || r.tempCode || '-',
        r.tempCode || '-',
        r.itemName || '-',
        r.package || '-',
        r.circle || '-',
        cv('solan', r.solanLoaQty), cv('solan', r.solanBomQty), cv('nahan', r.nahanLoaQty), cv('nahan', r.nahanBomQty), cv('rampur', r.rampurLoaQty), cv('rampur', r.rampurBomQty), cv('rohru', r.rohruLoaQty), cv('rohru', r.rohruBomQty),
        cv('solan', r.dispatchedSolan), cv('nahan', r.dispatchedNahan), cv('rampur', r.dispatchedRampur), cv('rohru', r.dispatchedRohru),
        cv('solan', r.inwardSolan), cv('nahan', r.inwardNahan), cv('rampur', r.inwardRampur), cv('rohru', r.inwardRohru),
        cv('solan', r.mhrovSolan), cv('nahan', r.mhrovNahan), cv('rampur', r.mhrovRampur), cv('rohru', r.mhrovRohru),
        cv('solan', r.minSolan), cv('nahan', r.minNahan), cv('rampur', r.minRampur), cv('rohru', r.minRohru),
        cv('solan', r.imcSolan), cv('nahan', r.imcNahan), cv('rampur', r.imcRampur), cv('rohru', r.imcRohru),
        cv('solan', r.supplyBilledSolan), cv('nahan', r.supplyBilledNahan), cv('rampur', r.supplyBilledRampur), cv('rohru', r.supplyBilledRohru),
        cv('solan', r.erectionBilledSolan), cv('nahan', r.erectionBilledNahan), cv('rampur', r.erectionBilledRampur), cv('rohru', r.erectionBilledRohru),
        ...['solan', 'nahan', 'rampur', 'rohru'].flatMap(c => {
          if (!itemCirc.includes(c)) return ['-', '-', '-', '-', '-', '-', '-'];
          const b = r.allBalances ? r.allBalances[c] : (r.balances || {});
          return [
            b.diVsLoa?.toLocaleString(undefined, {minimumFractionDigits: 2}) ?? '0.00', 
            b.diVsBom?.toLocaleString(undefined, {minimumFractionDigits: 2}) ?? '0.00', 
            b.mrn?.toLocaleString(undefined, {minimumFractionDigits: 2}) ?? '0.00', 
            b.mhrov?.toLocaleString(undefined, {minimumFractionDigits: 2}) ?? '0.00', 
            b.imc?.toLocaleString(undefined, {minimumFractionDigits: 2}) ?? '0.00', 
            b.supplyBill?.toLocaleString(undefined, {minimumFractionDigits: 2}) ?? '0.00', 
            b.erectionBill?.toLocaleString(undefined, {minimumFractionDigits: 2}) ?? '0.00'
          ];
        })
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [headers],
      body: rows,
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        3: { cellWidth: 50 } // Item name slightly wider
      },
      theme: 'grid'
    });

    doc.save(\`Item_Summary_Matrix_\${targetCircle}_\${new Date().toISOString().slice(0,10)}.pdf\`);
  };
`;

content = content.replace('const handleExportCSV = () => {', exportPDFCode + '\n\n  const handleExportCSV = () => {');

// 3. Add Export PDF button to the UI
const buttonCode = `
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
          >
            <span>📄</span> Export to PDF
          </button>
          <button
`;

content = content.replace('<button\n          onClick={handleExportCSV}', buttonCode + '          onClick={handleExportCSV}');
content = content.replace('<span>📥</span> Export to CSV\n        </button>', '<span>📥</span> Export to CSV\n          </button>\n        </div>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched page.tsx successfully.');
