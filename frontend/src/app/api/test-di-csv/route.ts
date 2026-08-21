import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://localhost:5000/api/di?page=1&limit=10');
    const json = await res.json();
    
    const data = json.data?.dis || json.data || [];
    
    const headers = ['DINumber', 'PurchaseOrderNumber', 'VendorName', 'Date', 'Circle', 'Package', 'Notes', 'ItemName', 'TempCode', 'LoaSerialNo', 'Unit', 'Quantity'];
    
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: any[] = [];
    
    data.forEach((di: any) => {
      if (di.lineItems && di.lineItems.length > 0) {
        di.lineItems.forEach((li: any) => {
          rows.push({
            'DINumber': di.diNumber || '',
            'PurchaseOrderNumber': di.poNumber || di.purchaseOrderId?.purchaseOrderNumber || '',
            'VendorName': di.vendorName || di.purchaseOrderId?.vendorName || '',
            'Date': di.date ? new Date(di.date).toISOString().split('T')[0] : '',
            'Circle': li.circle || di.circle || '',
            'Package': li.package || di.package || '',
            'Notes': di.notes || '',
            'ItemName': li.itemName || '',
            'TempCode': li.tempCode || '',
            'LoaSerialNo': li.loaSerialNo || '',
            'Unit': li.unit || '',
            'Quantity': li.quantity !== undefined ? li.quantity : 0
          });
        });
      }
    });
    
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: { 'Content-Type': 'text/csv' }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
