const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function findSimilarItems() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const items = await db.collection('items').find({ 
    "dynamicData.name": { $regex: /MS ANGLE 50X50X6/i } 
  }).toArray();
  
  console.log(`Found ${items.length} items matching MS ANGLE 50X50X6`);
  for (let item of items) {
    console.log(`- ID: ${item._id} | Name: ${item.dynamicData.name} | TempCode: ${item.dynamicData.tempCode}`);
    
    const inwards = await db.collection('storeinwardentries').find({
      itemId: item._id,
      circle: { $regex: /nahan/i }
    }).toArray();
    
    let totalInward = 0;
    inwards.forEach(entry => {
      totalInward += Number(entry.receivedQty || entry.acceptedQty || entry.invoiceQty || entry.totalQty || 0);
    });
    console.log(`  -> Store Inwards (Nahan) for this item ID: ${totalInward} from ${inwards.length} entries`);

    // Let's also check purchaseinvoices
    const invoices = await db.collection('purchaseinvoices').find({
      circle: { $regex: /nahan/i },
      "items.itemId": item._id
    }).toArray();
    
    let totalInvoice = 0;
    invoices.forEach(inv => {
      inv.items.forEach(i => {
        if (i.itemId.toString() === item._id.toString()) {
          totalInvoice += Number(i.invoiceQty || i.quantity || 0);
        }
      });
    });
    console.log(`  -> Purchase Invoices (Nahan) for this item ID: ${totalInvoice} from ${invoices.length} entries`);
  }

  await mongoose.disconnect();
}

findSimilarItems();
