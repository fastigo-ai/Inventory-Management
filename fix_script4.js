const fs = require('fs');
const path = 'frontend/src/app/site-portal/contractor-billing/new/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Fix potential undefined fields in auto-populate
code = code.replace(/activity: act,/g, 'activity: act || "",');
code = code.replace(/description: itemName,/g, 'description: itemName || "",');
code = code.replace(/rate: rate,/g, 'rate: rate || 0,');
code = code.replace(/tempCode: tc,/g, 'tempCode: tc || "",');
code = code.replace(/loaSerialNo: loaNo,/g, 'loaSerialNo: loaNo || "",');

fs.writeFileSync(path, code);
