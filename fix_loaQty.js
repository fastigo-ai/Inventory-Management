const fs = require('fs');
const filePath = 'frontend/src/app/site-portal/jmc-register/new/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'totalLoaQty: Number(ai.dynamicData?.totalLoaQuantity || ai.dynamicData?.qty || ai.dynamicData?.quantity || 0),',
  'totalLoaQty: Number(ai.dynamicData?.loaQty || ai.dynamicData?.totalLoaQuantity || ai.dynamicData?.qty || ai.dynamicData?.quantity || 0),'
);

fs.writeFileSync(filePath, content);
