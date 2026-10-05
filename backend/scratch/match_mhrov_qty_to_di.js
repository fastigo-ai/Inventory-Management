const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);
    const db = mongoose.connection.db;

    // We can query the DI collection to find any lineItems where mhrovDoneQty > quantity
    const overDis = await db.collection('dis').find({
      $expr: {
        $gt: [
          { $size: {
            $filter: {
              input: { $ifNull: ["$lineItems", []] },
              as: "item",
              cond: { $gt: [{ $ifNull: ["$$item.mhrovDoneQty", 0] }, { $ifNull: ["$$item.quantity", 0] }] }
            }
          }},
          0
        ]
      }
    }).toArray();

    if (overDis.length === 0) {
      console.log("No items currently have an MHROV quantity greater than the DI quantity.");
      process.exit(0);
    }

    console.log(`Found ${overDis.length} DIs with overages. Starting correction...`);
    
    for (const di of overDis) {
      let diModified = false;

      for (let i = 0; i < di.lineItems.length; i++) {
        const item = di.lineItems[i];
        
        const mhrovQty = item.mhrovDoneQty || 0;
        const diQty = item.quantity || 0;
        
        if (mhrovQty > diQty) {
          let overage = mhrovQty - diQty;
          console.log(`\nCorrecting DI ${di.diNumber} | Item: ${item.itemName} | Overage: ${overage}`);

          // Find all MHROV documents that have this DI and itemId
          const mhrovs = await db.collection('mhrovs').find({
            "items.diId": di._id,
            "items.itemId": item.itemId
          }).toArray();

          for (const m of mhrovs) {
            let mModified = false;
            if (overage <= 0) break;

            for (let j = 0; j < m.items.length; j++) {
              const mItem = m.items[j];
              
              if (mItem.diId?.toString() === di._id.toString() && mItem.itemId?.toString() === item.itemId?.toString()) {
                const currentMItemQty = mItem.mhrovDoneQty || 0;
                
                if (currentMItemQty > 0) {
                  const deduction = Math.min(currentMItemQty, overage);
                  mItem.mhrovDoneQty -= deduction;
                  overage -= deduction;
                  mModified = true;
                  console.log(`  - Deducted ${deduction} from MHROV ${m.mhrovNumber}. New qty for this MHROV item: ${mItem.mhrovDoneQty}`);
                  
                  if (overage <= 0) break;
                }
              }
            }

            if (mModified) {
              await db.collection('mhrovs').updateOne(
                { _id: m._id },
                { $set: { items: m.items } }
              );
            }
          }

          // Update the DI's line item to perfectly match the quantity
          di.lineItems[i].mhrovDoneQty = diQty;
          diModified = true;
        }
      }

      if (diModified) {
        await db.collection('dis').updateOne(
          { _id: di._id },
          { $set: { lineItems: di.lineItems } }
        );
        console.log(`Saved DI ${di.diNumber} successfully.`);
      }
    }

    console.log("\nFinished correcting all discrepancies.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
