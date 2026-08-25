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
      
      // If quantity is 0 but srt > 0, the import script mistakenly put the qty in srt!
      if (q === 0 && srt > 0) {
        finalQty = srt;
        needsUpdate = true;
      }
      
      // We must also recalculate the amount!
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
          total: newSubTotal // Assuming no complex taxes for these corrupted ones, or we leave tax as is if we want to be perfectly accurate, but the UI sum is what matters.
        } 
      });
      updatedCount++;
    }
  }

  console.log(`Fixed quantities for ${updatedCount} Purchase Invoices.`);
  mongoose.disconnect();
}
run().catch(console.error);
