const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  
  const piIds = ["6a8a05bb3b88abfdcfdb6b30", "6a8a05b63b88abfdcfdb6a59"];
  let updatedCount = 0;

  for (const piId of piIds) {
    const pi = await PurchaseInvoice.findById(piId).lean();
    if (!pi) continue;

    let needsUpdate = false;
    let newSubTotal = 0;
    
    const updatedLineItems = (pi.lineItems || []).map(li => {
      let finalQty = Number(li.quantity || 0);
      const srt = Number(li.srt || 0);
      
      // We know these specific PIs have evenly split SRTs for tempCode 127!
      if (String(li.tempCode).trim() === '127' && srt > 0 && finalQty === srt) {
        finalQty = finalQty + srt;
        li.srt = 0;
        needsUpdate = true;
        console.log(`Fixing PI ${pi.invoiceNumber}: Was ${finalQty - srt}, Adding ${srt}, Now ${finalQty}`);
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

  console.log(`Fixed evenly split quantities for ${updatedCount} Purchase Invoices.`);
  mongoose.disconnect();
}
run().catch(console.error);
