import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  let jmcFixed = 0;
  let minFixed = 0;

  // 1. Fix JMC Registers
  const jmcs = await db.collection('jmcregisters').find({ status: { $nin: ['Rejected', 'Cancelled'] } }).toArray();
  for (const doc of jmcs) {
    let modified = false;
    const docCircle = (doc.circle || '').toLowerCase();

    for (const item of doc.items || []) {
      if (!item.tempCode && !item.loaSerialNo) continue;

      const query: any = {};
      if (docCircle) query['dynamicData.circle'] = new RegExp(`^${docCircle}$`, 'i');
      if (item.tempCode) query['dynamicData.tempCode'] = item.tempCode;
      if (item.loaSerialNo) query['dynamicData.loaSerialNo'] = item.loaSerialNo;

      const masterItems = await db.collection('items').find(query).toArray();
      if (masterItems.length === 1) {
        if (!item.itemId || item.itemId.toString() !== masterItems[0]._id.toString()) {
          item.itemId = masterItems[0]._id;
          modified = true;
        }
      } else if (masterItems.length > 1) {
        const exactMatch = masterItems.find(m => m.dynamicData?.itemName?.toLowerCase() === item.description?.toLowerCase());
        if (exactMatch) {
          if (!item.itemId || item.itemId.toString() !== exactMatch._id.toString()) {
            item.itemId = exactMatch._id;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      await db.collection('jmcregisters').updateOne({ _id: doc._id }, { $set: { items: doc.items } });
      jmcFixed++;
    }
  }
  console.log(`Fixed ${jmcFixed} JMC Records`);

  // 2. Fix MINs (Contractor Assignments)
  const mins = await db.collection('contractorassignments').find({ status: { $ne: 'Cancelled' } }).toArray();
  for (const doc of mins) {
    let modified = false;
    const docCircle = (doc.location || doc.warehouseLocation || '').toLowerCase();

    for (const item of doc.lineItems || []) {
      if (!item.tempCode) continue;

      const query: any = { 'dynamicData.tempCode': item.tempCode };
      if (docCircle && docCircle.length > 2) {
        if (docCircle.includes('solan')) query['dynamicData.circle'] = /solan/i;
        else if (docCircle.includes('nahan')) query['dynamicData.circle'] = /nahan/i;
        else if (docCircle.includes('rampur')) query['dynamicData.circle'] = /rampur/i;
        else if (docCircle.includes('rohru')) query['dynamicData.circle'] = /rohru/i;
      }

      if (item.loaSerialNo || item.loaSrNo) {
        query['dynamicData.loaSerialNo'] = item.loaSerialNo || item.loaSrNo;
      }

      const masterItems = await db.collection('items').find(query).toArray();
      if (masterItems.length === 1) {
        if (!item.itemId || item.itemId.toString() !== masterItems[0]._id.toString()) {
          item.itemId = masterItems[0]._id;
          modified = true;
        }
      } else if (masterItems.length > 1) {
        const exactMatch = masterItems.find(m => m.dynamicData?.itemName?.trim().toLowerCase() === item.itemName?.trim().toLowerCase());
        if (exactMatch) {
          if (!item.itemId || item.itemId.toString() !== exactMatch._id.toString()) {
            item.itemId = exactMatch._id;
            modified = true;
          }
        } else {
            const actMatch = masterItems.find(m => item.activity && m.dynamicData?.package && item.activity.toLowerCase().includes(m.dynamicData.package.toLowerCase()));
            if (actMatch) {
                if (!item.itemId || item.itemId.toString() !== actMatch._id.toString()) {
                  item.itemId = actMatch._id;
                  modified = true;
                }
            }
        }
      }
    }

    if (modified) {
      await db.collection('contractorassignments').updateOne({ _id: doc._id }, { $set: { lineItems: doc.lineItems } });
      minFixed++;
    }
  }
  console.log(`Fixed ${minFixed} MIN Records`);

  process.exit(0);
}

run().catch(console.error);
