const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    // Simulate what the controller does:
    const itemFilter = { isDeleted: { $ne: true } };
    // User searches for '1'
    itemFilter['dynamicData.tempCode'] = '1';
    
    const items = await db.collection('items').find(itemFilter).toArray();
    console.log(`Found ${items.length} items with TempCode 1`);
    
    const groupMap = new Map();
    const itemIdToKeyMap = new Map();
    
    items.forEach(it => {
      const tempCode = (it.dynamicData?.tempCode || '').toString().trim();
      const loaSrNo = (it.dynamicData?.loaSerialNo || '').toString().trim();
      const groupKey = `${tempCode}_${loaSrNo}`;
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          itemName: it.dynamicData?.name || it.name,
          totalIssuedQty: 0
        });
      }
      itemIdToKeyMap.set(it._id.toString(), groupKey);
    });
    
    console.log(`groupMap has '1_104': ${groupMap.has('1_104')}`);
    
    // Find MIN 1
    const a = await db.collection('contractorassignments').findOne({ assignmentNumber: '1', circle: /ROHRU/i });
    
    for (const line of a.lineItems) {
      const qty = Number(line.quantity || line.demandQty || 0);
      let targetKeys = new Set();
      
      const idStr = line.itemId ? line.itemId.toString() : '';
      if (idStr && itemIdToKeyMap.has(idStr)) {
        targetKeys.add(itemIdToKeyMap.get(idStr));
      }
      
      const tc = String(line.tempCode || '').trim();
      const loaSr = String(line.loaSerialNo || line.loaSrNo || '').trim();
      if (tc && loaSr) {
        if (groupMap.has(`${tc}_${loaSr}`)) {
          targetKeys.add(`${tc}_${loaSr}`);
        }
      } else if (loaSr) {
        if (groupMap.has(loaSr)) targetKeys.add(loaSr);
      }
      
      let keys = Array.from(targetKeys);
      if (keys.length === 0) { // Fallback
         const matchingKeys = Array.from(groupMap.keys()).filter(key => {
            const groupItem = groupMap.get(key);
            const name = (line.itemName || '').trim().toLowerCase();
            const groupName = (groupItem.itemName || '').toLowerCase();
            if (groupName && name) {
               return groupName.includes(name) || name.includes(groupName);
            }
            return false;
         });
         if (matchingKeys.length > 0) {
            keys = matchingKeys;
            console.log(`Fallback matched for '${line.itemName}': ${keys.join(', ')}`);
         }
      }
      
      keys.forEach(key => {
        if (groupMap.has(key)) {
           groupMap.get(key).totalIssuedQty += qty;
        }
      });
    }
    
    console.log('1_104 totalIssuedQty:', groupMap.get('1_104')?.totalIssuedQty);
    console.log('1_1363 totalIssuedQty:', groupMap.get('1_1363')?.totalIssuedQty);
    console.log('1_1380 totalIssuedQty:', groupMap.get('1_1380')?.totalIssuedQty);
    console.log('1_1664 totalIssuedQty:', groupMap.get('1_1664')?.totalIssuedQty);
    
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
