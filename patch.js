const fs = require('fs');
const file = 'frontend/src/app/ho-billing/contractor-work-orders/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add Papa import
if (!content.includes("import Papa from 'papaparse';")) {
  content = content.replace("import { api } from \"@/shared/api/axios\";", "import { api } from \"@/shared/api/axios\";\nimport Papa from 'papaparse';");
}

// Add functions
const functionsStr = `
  const downloadTemplate = () => {
    const csvContent = "itemId,tempCode,activity,loaSrNo,description,unit,circleLoaQty,woQty,contractorErectionRate,gstType\\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "work_order_template.csv";
    link.click();
  };

  const exportToCsv = () => {
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }
    const csvData = items.map(item => ({
      itemId: item.itemId,
      tempCode: item.tempCode,
      activity: item.activity,
      loaSrNo: item.loaSrNo,
      description: item.description,
      unit: item.unit,
      circleLoaQty: item.circleLoaQty,
      circleBomQty: item.circleBomQty,
      alreadyIssuedQty: item.alreadyIssuedQty,
      woQty: item.woQty,
      contractorErectionRate: item.contractorErectionRate,
      amount: item.amount,
      gstType: item.gstType,
      gstAmount: item.gstAmount,
      totalAmount: item.totalAmount
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "work_order_items.csv";
    link.click();
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedItems = results.data.map((row: any, idx: number) => {
          const woQty = Number(row.woQty) || 0;
          const contractorErectionRate = Number(row.contractorErectionRate) || 0;
          const amount = woQty * contractorErectionRate;
          const gstAmount = amount * 0.18;
          return {
            itemId: row.itemId || '',
            tempCode: row.tempCode || '',
            activity: row.activity || '',
            loaSrNo: row.loaSrNo || '',
            description: row.description || '',
            unit: row.unit || '',
            circleLoaQty: Number(row.circleLoaQty) || 0,
            circleBomQty: Number(row.circleBomQty) || 0,
            totalPackageLoaQty: 0,
            alreadyIssuedQty: Number(row.alreadyIssuedQty) || 0,
            woQty,
            contractorErectionRate,
            amount,
            gstType: row.gstType || 'Intra',
            gstAmount,
            totalAmount: amount + gstAmount,
            originalIndex: items.length + idx
          };
        });
        
        const newActivities = new Set([...formData.activities, ...parsedItems.map((i: any) => i.activity).filter(Boolean)]);
        setFormData(prev => ({ ...prev, activities: Array.from(newActivities) as string[] }));
        
        setItems(prev => {
          const combined = [...prev, ...parsedItems];
          return combined.sort((a, b) => {
            const aVal = String(a.loaSrNo || '').trim();
            const bVal = String(b.loaSrNo || '').trim();
            return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
          });
        });
        toast.success(\`Imported \${parsedItems.length} items\`);
        e.target.value = '';
      },
      error: (error) => {
        toast.error('Failed to parse CSV');
        console.error(error);
      }
    });
  };

  const handleSave = async () => {`;

content = content.replace("  const handleSave = async () => {", functionsStr);

fs.writeFileSync(file, content);
