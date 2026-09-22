const fs = require('fs');
const path = require('path');

const wipControllerPath = path.join(__dirname, 'backend/src/modules/wip/wip.controller.ts');
const wipReqControllerPath = path.join(__dirname, 'backend/src/modules/wip-required/wipRequired.controller.ts');

const wipCode = fs.readFileSync(wipControllerPath, 'utf8');
let wipReqCode = fs.readFileSync(wipReqControllerPath, 'utf8');

// 1. Add sseService import if not exists
if (!wipReqCode.includes('sseService')) {
  wipReqCode = wipReqCode.replace(
    /import cloudinary from '\.\.\/\.\.\/core\/utils\/cloudinary';/,
    `import cloudinary from '../../core/utils/cloudinary';\nimport { sseService } from '../../core/utils/sse.service';`
  );
}

// Extract the getNextWipSequence
let seqCode = "";
const seqStart = wipCode.indexOf("const getNextWipSequence");
if (seqStart !== -1) {
  const seqEnd = wipCode.indexOf("};", seqStart) + 2;
  seqCode = wipCode.substring(seqStart, seqEnd);
  seqCode = seqCode.replace(/WipRegister/g, 'WipRequiredRegister');
}

// 2. Extract uploadWipExcel from wip.controller.ts
const uploadStart = wipCode.indexOf("export const uploadWipExcel");
if (uploadStart !== -1) {
  let uploadCode = wipCode.substring(uploadStart);
  // Replace references
  uploadCode = uploadCode.replace(/uploadWipExcel/g, 'uploadWipRequiredExcel');
  uploadCode = uploadCode.replace(/WipRegister/g, 'WipRequiredRegister');
  uploadCode = uploadCode.replace(/WIP Bulk Import/g, 'WIP Required Bulk Import');
  
  // Now replace the existing uploadWipRequiredExcel in wipReqCode
  const existingUploadStart = wipReqCode.indexOf("export const uploadWipRequiredExcel");
  if (existingUploadStart !== -1) {
    wipReqCode = wipReqCode.substring(0, existingUploadStart);
    if (!wipReqCode.includes("getNextWipSequence") && seqCode) {
      wipReqCode += "\n" + seqCode + "\n\n";
    }
    wipReqCode += uploadCode;
  } else {
    console.log("Could not find existing uploadWipRequiredExcel");
  }
} else {
  console.log("Could not extract uploadWipExcel");
}

fs.writeFileSync(wipReqControllerPath, wipReqCode);
console.log("Updated wipRequired.controller.ts successfully.");


// FRONTEND 
const wipModalPath = path.join(__dirname, 'frontend/src/features/site-portal/components/WipBulkUploadModal.tsx');
const wipReqModalPath = path.join(__dirname, 'frontend/src/features/site-portal/components/WipRequiredBulkUploadModal.tsx');

let wipModalCode = fs.readFileSync(wipModalPath, 'utf8');

// Replace references
wipModalCode = wipModalCode.replace(/WipBulkUploadModal/g, 'WipRequiredBulkUploadModal');
wipModalCode = wipModalCode.replace(/uploadWipExcel/g, 'uploadWipRequiredExcel');
wipModalCode = wipModalCode.replace(/api\/wip\.api/g, 'api/wipRequired.api');
wipModalCode = wipModalCode.replace(/wip_consumed_bulk_upload_sample/g, 'wip_required_bulk_upload_sample');
wipModalCode = wipModalCode.replace(/Total WIPs/g, 'Total WIPs');

fs.writeFileSync(wipReqModalPath, wipModalCode);
console.log("Updated WipRequiredBulkUploadModal.tsx successfully.");

// API
const wipReqApiPath = path.join(__dirname, 'frontend/src/features/site-portal/api/wipRequired.api.ts');
let wipReqApiCode = fs.readFileSync(wipReqApiPath, 'utf8');

// replace uploadWipRequiredExcel to remove Content-Type
if (!wipReqApiCode.includes('uploadWipRequiredExcel(formData: FormData)')) {
   console.log('Update wipRequired.api.ts manually.');
}

