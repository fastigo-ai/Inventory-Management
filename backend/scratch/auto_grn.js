const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;

  const StoreInwardEntry = mongoose.models.StoreInwardEntry || mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));
  const Item = mongoose.models.Item || mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

  console.log("Fetching all Pending Receipt entries...");
  const entries = await StoreInwardEntry.find({ status: 'Pending Receipt', entryType: { $ne: 'HISTORICAL' } });
  
  let processedCount = 0;
  
  for (const entry of entries) {
    let poQty = 0;
    let packQty = 0;
    
    // Attempt to get PO Quantity from packingList or invoiceQty
    if (entry.packingList && entry.packingList.length > 0) {
       packQty = Number(entry.packingList[0].quantity || 0);
    }
    poQty = packQty > 0 ? packQty : Number(entry.invoiceQty || 0);
    
    if (poQty <= 0) {
       // if we can't figure it out, skip it
       continue;
    }
    
    // Update fields
    const updateObj = {
      status: 'Approved',
      receivedDate: new Date(),
      grDate: new Date(),
      transportName: 'Auto Generated',
      truckNumber: 'Auto Generated',
      grNumber: 'Auto Generated',
      biltyNumber: 'Auto Generated',
      remarks: 'Auto-approved via AI',
      invoiceQty: poQty,
      totalQty: poQty,
      challanQty: poQty,
      rejectedQty: 0,
      'packingList.0.quantity': poQty,
      updatedAt: new Date()
    };
    
    await StoreInwardEntry.updateOne({ _id: entry._id }, { $set: updateObj });
    
    // Now simulate processInwardStockUpdate
    if (entry.itemId) {
      const item = await Item.findById(entry.itemId);
      if (item) {
        let currentStock = Number(item.dynamicData?.stock || 0);
        let locations = item.dynamicData?.stockLocations || [];
        const circle = entry.circle || 'Default';
        const pkg = entry.package || 'Default';
        let locIndex = locations.findIndex((l) => l.circle === circle && l.package === pkg);
        
        if (locIndex >= 0) {
          locations[locIndex].quantity = (Number(locations[locIndex].quantity || 0) + poQty).toString();
        } else {
          locations.push({ circle, package: pkg, quantity: poQty.toString() });
        }
        currentStock += poQty;
        
        await Item.updateOne(
          { _id: item._id },
          { 
            $set: { 
              'dynamicData.stock': currentStock.toString(),
              'dynamicData.stockLocations': locations
            }
          }
        );
      }
    }
    
    processedCount++;
    if (processedCount % 50 === 0) {
      console.log(`Processed ${processedCount} entries...`);
    }
  }
  
  console.log(`Done! Auto-approved ${processedCount} GRN entries.`);
  process.exit(0);
}

run().catch(console.error);
