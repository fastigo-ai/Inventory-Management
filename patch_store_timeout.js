const fs = require('fs');
const path = require('path');

const filePath = 'frontend/src/features/store/api/store.api.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/api\.post\('\/store\/inventory\/inward\/bulk-import',\s*\{\s*entries:\s*data\s*\}\)/g, "api.post('/store/inventory/inward/bulk-import', { entries: data }, { timeout: 300000 })");

content = content.replace(/api\.post\('\/store\/inventory\/inward\/import',\s*formData,\s*\{\n\s*headers:\s*\{\s*'Content-Type':\s*'multipart\/form-data'\s*\}\n\s*\}\)/g, "api.post('/store/inventory/inward/import', formData, {\n    headers: { 'Content-Type': 'multipart/form-data' },\n    timeout: 300000\n  })");

content = content.replace(/api\.post\('\/store\/transfers\/outward\/import',\s*formData,\s*\{\n\s*headers:\s*\{\s*'Content-Type':\s*'multipart\/form-data'\s*\}\n\s*\}\)/g, "api.post('/store/transfers/outward/import', formData, {\n    headers: { 'Content-Type': 'multipart/form-data' },\n    timeout: 300000\n  })");

content = content.replace(/api\.post\('\/store\/transfers\/inward\/import',\s*formData,\s*\{\n\s*headers:\s*\{\s*'Content-Type':\s*'multipart\/form-data'\s*\}\n\s*\}\)/g, "api.post('/store/transfers/inward/import', formData, {\n    headers: { 'Content-Type': 'multipart/form-data' },\n    timeout: 300000\n  })");

fs.writeFileSync(filePath, content);
console.log("Patched API timeouts");
