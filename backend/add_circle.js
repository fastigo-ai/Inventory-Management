const xlsx = require('xlsx');
const fs = require('fs');

const files = [
  'frontend/public/jmc_bulk_upload_sample.xlsx',
  'frontend/public/wip_consumed_bulk_upload_sample.xlsx',
  'frontend/public/wip_required_bulk_upload_sample.xlsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    const wb = xlsx.readFile(file);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    
    let contractorIndex = -1;
    for(let i=0; i<Math.min(data.length, 10); i++){
       if(data[i] && data[i][0] && typeof data[i][0] === 'string' && data[i][0].includes('Contractor')) {
           contractorIndex = i;
           break;
       }
    }
    
    if (contractorIndex !== -1) {
       data.splice(contractorIndex + 1, 0, ["Name Of Circle :"]);
    } else {
       data.splice(1, 0, ["Name Of Circle :"]);
    }

    const newWs = xlsx.utils.aoa_to_sheet(data);
    wb.Sheets[sheetName] = newWs;
    xlsx.writeFile(wb, file);
    console.log('Updated ' + file);
  } else {
    console.log('Not found: ' + file);
  }
});
