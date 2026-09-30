const fs = require('fs');
let content = fs.readFileSync('backend/src/modules/client-billing/clientBill.controller.ts', 'utf8');

const importsToAdd = `
import { DI } from '../di/di.schema';
import { expandCircle } from '../../utils/hierarchy';
`;
content = content.replace("import Item from '../items/item.model';", "import Item from '../items/item.model';" + importsToAdd);

const prefetchReplacement = `
  const uniqueDiNos = [...new Set(rows.map(r => String(r.dino || r.dinumber || '').trim()).filter(Boolean))];
  const uniqueMhrovNos = [...new Set(rows.map(r => String(r.mhrovno || r.mhrovnumber || r.sourceref || '').trim()).filter(Boolean))];
  
  const allItems = await Item.find({}).lean();
  const allDIs = await DI.find({ diNumber: { $in: uniqueDiNos } }).lean();
  const allMhrovs = await Mhrov.find({ mhrovNumber: { $in: uniqueMhrovNos } }).lean();
`;
content = content.replace("  // Pre-fetch all items for quick matching\r\n  const allItems = await Item.find({}).lean();", prefetchReplacement);
content = content.replace("  // Pre-fetch all items for quick matching\n  const allItems = await Item.find({}).lean();", prefetchReplacement);

fs.writeFileSync('backend/src/modules/client-billing/clientBill.controller.ts', content);
