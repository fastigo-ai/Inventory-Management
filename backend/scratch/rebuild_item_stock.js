const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const Item = mongoose.models.Item || mongoose.model('Item', new mongoose.Schema({}, { strict: false }));
  const StoreInwardEntry = mongoose.models.StoreInwardEntry || mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));
  
  console.log("Rebuilding stock for all items...");
  
  // 1. Reset all stock and stockLocations to 0 / empty
  console.log("Resetting all items to 0 stock...");
  await Item.updateMany({}, { 
    $set: { 
      'dynamicData.stock': '0', 
      'dynamicData.stockLocations': [] 
    } 
  });
  
  // 2. Aggregate all Approved / Verified inwards
  console.log("Calculating total inwards...");
  const inwards = await StoreInwardEntry.find({ status: { $in: ['Approved', 'Verified'] } });
  
  let processed = 0;
  for (const entry of inwards) {
    if (entry.itemId && entry.invoiceQty) {
       const qtyToAdd = Number(entry.invoiceQty || 0);
       if (qtyToAdd <= 0) continue;
       
       const item = await Item.findById(entry.itemId);
       if (item) {
          const currentStock = Number(item.dynamicData?.stock || 0);
          let locations = item.dynamicData?.stockLocations || [];
          
          const circle = entry.circle || 'Default';
          const pkg = entry.package || 'Default';
          let locIndex = locations.findIndex(l => l.circle === circle && l.package === pkg);
          
          if (locIndex >= 0) {
            locations[locIndex].quantity = (Number(locations[locIndex].quantity || 0) + qtyToAdd).toString();
          } else {
            locations.push({ circle, package: pkg, quantity: qtyToAdd.toString() });
          }
          
          await Item.updateOne(
            { _id: item._id },
            { 
              $set: { 
                'dynamicData.stock': (currentStock + qtyToAdd).toString(),
                'dynamicData.stockLocations': locations
              }
            }
          );
       }
    }
    processed++;
    if (processed % 100 === 0) console.log(`Processed ${processed} inwards...`);
  }
  
  // 3. Subtract MHROV
  console.log("Calculating MHROV...");
  const mhrovs = await db.collection('mhrovs').find({ status: { $in: ['Verified', 'Approved'] } }).toArray();
  for (const m of mhrovs) {
    if (!m.items) continue;
    for (const li of m.items) {
       if (li.itemId && li.mhrovDoneQty) {
          const item = await Item.findById(li.itemId);
          if (item) {
             const qtyToSub = Number(li.mhrovDoneQty || 0);
             const currentStock = Number(item.dynamicData?.stock || 0);
             
             let locations = item.dynamicData?.stockLocations || [];
             const circle = m.circle || 'Default';
             const pkg = m.package || 'Default';
             
             let locIndex = locations.findIndex(l => l.circle === circle && l.package === pkg);
             if (locIndex >= 0) {
               locations[locIndex].quantity = Math.max(0, Number(locations[locIndex].quantity || 0) - qtyToSub).toString();
             }
             
             await Item.updateOne(
               { _id: item._id },
               { 
                 $set: { 
                   'dynamicData.stock': Math.max(0, currentStock - qtyToSub).toString(),
                   'dynamicData.stockLocations': locations
                 }
               }
             );
          }
       }
    }
  }

  // 4. Transfers
  console.log("Calculating Transfers...");
  const transfers = await db.collection('storetransfers').find({ status: { $in: ['Approved', 'Verified', 'Dispatched', 'Received'] } }).toArray();
  for (const t of transfers) {
    if (!t.lineItems) continue;
    for (const li of t.lineItems) {
       if (li.itemId && li.quantity) {
          const item = await Item.findById(li.itemId);
          if (item) {
             const qtyToSub = Number(li.quantity || 0);
             const currentStock = Number(item.dynamicData?.stock || 0);
             
             let locations = item.dynamicData?.stockLocations || [];
             const circle = t.fromCircle || 'Default';
             const pkg = t.fromPackage || 'Default';
             
             let locIndex = locations.findIndex(l => l.circle === circle && l.package === pkg);
             if (locIndex >= 0) {
               locations[locIndex].quantity = Math.max(0, Number(locations[locIndex].quantity || 0) - qtyToSub).toString();
             }
             
             if (t.status === 'Received' || t.status === 'Approved' || t.status === 'Verified') {
               const toCircle = t.toCircle || 'Default';
               const toPkg = t.toPackage || 'Default';
               let toLocIndex = locations.findIndex(l => l.circle === toCircle && l.package === toPkg);
               if (toLocIndex >= 0) {
                 locations[toLocIndex].quantity = (Number(locations[toLocIndex].quantity || 0) + qtyToSub).toString();
               } else {
                 locations.push({ circle: toCircle, package: toPkg, quantity: qtyToSub.toString() });
               }
               
               await Item.updateOne({ _id: item._id }, { $set: { 'dynamicData.stockLocations': locations } });
             } else {
               await Item.updateOne(
                 { _id: item._id },
                 { 
                   $set: { 
                     'dynamicData.stock': Math.max(0, currentStock - qtyToSub).toString(),
                     'dynamicData.stockLocations': locations
                   }
                 }
               );
             }
          }
       }
    }
  }
  
  console.log("Stock rebuilt successfully!");
  process.exit(0);
}

run().catch(console.error);
