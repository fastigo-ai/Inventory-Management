const fs = require('fs');
const path = './backend/src/modules/store/store.controller.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { getStoreItemModel } from '../items/utils';",
  "import { getStoreItemModel } from '../items/utils';\nimport { expandCircle } from '../../utils/hierarchy';"
);

content = content.replace(
  /const SUB_STORE_MAP: Record<string, string\[\]> = \{\s*'Solan': \['Solan', 'Kumarhatti', 'Nalagarh'\],\s*'Nahan': \['Nahan'\],\s*'Rohru': \['Rohru'\],\s*'Rampur': \['Rampur'\],\s*\};\s*/g,
  ""
);

content = content.replace(
  /const allowedCircles = SUB_STORE_MAP\[user.assignedCircle\] \|\| \[user.assignedCircle\];/g,
  "const allowedCircles = expandCircle(user.assignedCircle) || [user.assignedCircle];"
);

content = content.replace(
  /baseFilter\.circle = \{ \$regex: new RegExp\(\`\^\\\\s\*\$\{user\.assignedCircle\.trim\(\)\}\\\\s\*\$\`, 'i'\) \};/g,
  "baseFilter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };"
);

content = content.replace(
  /filter\.circle = \{ \$regex: new RegExp\(\`\^\\\\s\*\$\{user\.assignedCircle\.trim\(\)\}\\\\s\*\$\`, 'i'\) \};/g,
  "filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };"
);

content = content.replace(
  /if \(user\.assignedCircle\) filter\.circle = user\.assignedCircle;/g,
  "if (user.assignedCircle) filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };"
);

content = content.replace(
  /if \(user\.assignedCircle\) \{\s*filter\.circle = user\.assignedCircle;\s*mhrovFilter\.circle = user\.assignedCircle;\s*\}/g,
  "if (user.assignedCircle) {\n      const exp = expandCircle(user.assignedCircle) || [user.assignedCircle];\n      filter.circle = { $in: exp };\n      mhrovFilter.circle = { $in: exp };\n    }"
);

// Also need to handle cleanStoreName in getStoreTransfers
content = content.replace(
  /const storeNameRaw = circle \|\| \(user && user\.role\?\.name === 'Store Manager' \? user\.assignedCircle : ''\);\s*const cleanStoreName = storeNameRaw \? String\(storeNameRaw\)\.replace\(\/store\/i, ''\)\.trim\(\) : '';\s*if \(cleanStoreName\) \{/g,
  `const storeNameRaw = circle || (user && user.role?.name === 'Store Manager' ? user.assignedCircle : '');
  const cleanStoreName = storeNameRaw ? String(storeNameRaw).replace(/store/i, '').trim() : '';
  const expandedStoreNames = expandCircle(cleanStoreName) || [cleanStoreName];
  if (cleanStoreName) {
    const storeRegex = new RegExp(expandedStoreNames.join('|'), 'i');`
);

fs.writeFileSync(path, content);
console.log("Done");
