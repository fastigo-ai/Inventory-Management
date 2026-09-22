const fs = require('fs');
const path = 'frontend/src/app/ho-billing/contractor-work-orders/[id]/edit/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  /setFormData\(\{ \.\.\.formData, package: confirmDialog\.value, circle: '', contractorId: '', division: '', activities: \[\] \}\);/,
  `setFormData({ ...formData, package: confirmDialog.value, circle: '', contractorId: '', drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }], activities: [] });`
);

content = content.replace(
  /setFormData\(\{ \.\.\.formData, circle: confirmDialog\.value, contractorId: '', division: '', activities: \[\] \}\);/,
  `setFormData({ ...formData, circle: confirmDialog.value, contractorId: '', drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }], activities: [] });`
);

content = content.replace(
  /setFormData\(\{ \.\.\.formData, package: e\.target\.value, circle: '', contractorId: '', division: '', activities: \[\] \}\);/,
  `setFormData({ ...formData, package: e.target.value, circle: '', contractorId: '', drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }], activities: [] });`
);

content = content.replace(
  /setFormData\(\{ \.\.\.formData, circle: e\.target\.value, contractorId: '', division: '', activities: \[\] \}\);/,
  `setFormData({ ...formData, circle: e.target.value, contractorId: '', drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }], activities: [] });`
);

fs.writeFileSync(path, content, 'utf-8');
