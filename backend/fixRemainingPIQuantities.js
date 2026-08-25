const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  
  const pis = await PurchaseInvoice.find({}).lean();
  let updatedCount = 0;

  for (const pi of pis) {
    let needsUpdate = false;
    let newSubTotal = 0;
    
    const updatedLineItems = (pi.lineItems || []).map(li => {
      const q = Number(li.quantity || 0);
      const srt = Number(li.srt || 0);
      let finalQty = q;
      
      // If srt > 0 and q is not equal to srt, this means it's a split quantity invoice!
      // (For the 19 invoices we already fixed, q is now equal to srt, so this will safely ignore them)
      if (srt > 0 && q !== srt) {
        // Special safety check: ensure we are not adding srt if it was somehow already added.
        // Wait, the StoreInwardEntry for 1619 was 220. q=120, srt=100. So q + srt is the correct true quantity!
        finalQty = q + srt;
        
        // Clear the srt so it doesn't get added again if run twice
        li.srt = 0; 
        
        needsUpdate = true;
        console.log(`Fixing PI ${pi.invoiceNumber}: Was ${q}, Adding ${srt}, Now ${finalQty}`);
      }
      
      const rate = Number(li.rate || 0);
      const amount = finalQty * rate;
      newSubTotal += amount;
      
      return {
        ...li,
        quantity: finalQty,
        amount: amount,
        totalAmount: amount
      };
    });

    if (needsUpdate) {
      await PurchaseInvoice.updateOne({ _id: pi._id }, { 
        $set: { 
          lineItems: updatedLineItems,
          subTotal: newSubTotal,
          total: newSubTotal
        } 
      });
      updatedCount++;
    }
  }

  console.log(`Fixed split quantities for ${updatedCount} Purchase Invoices.`);
  mongoose.disconnect();
}
run().catch(console.error);
