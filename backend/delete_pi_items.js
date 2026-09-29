const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || '';

async function main() {
  if (!MONGO_URI) {
    console.error('No MONGO_URI found in environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const PurchaseInvoiceSchema = new mongoose.Schema({
      lineItems: [
        {
          circle: String,
          amount: Number,
          totalAmount: Number,
          quantity: Number,
          rate: Number,
          cgst: Number,
          sgst: Number,
          igst: Number,
          gstType: String
        }
      ],
      subTotal: Number,
      total: Number,
      taxAmount: Number,
      balanceDue: Number,
      amountPaid: Number
    }, { strict: false });

    const PurchaseInvoice = mongoose.models.PurchaseInvoice || mongoose.model('PurchaseInvoice', PurchaseInvoiceSchema);
    
    const StoreInwardEntrySchema = new mongoose.Schema({
      circle: String,
      purchaseInvoiceId: mongoose.Types.ObjectId
    }, { strict: false });

    const StoreInwardEntry = mongoose.models.StoreInwardEntry || mongoose.model('StoreInwardEntry', StoreInwardEntrySchema);

    const targetCircles = ['Rampur', 'Rohru'];

    // 1. Delete Inwards
    const inwardRes = await StoreInwardEntry.deleteMany({
      circle: { $in: targetCircles },
      purchaseInvoiceId: { $exists: true, $ne: null }
    });
    console.log(`Deleted ${inwardRes.deletedCount} StoreInwardEntry records for Rampur/Rohru.`);

    // 2. Update PIs
    const invoices = await PurchaseInvoice.find({ 'lineItems.circle': { $in: targetCircles } });
    let updatedPIs = 0;

    for (const pi of invoices) {
      const originalLen = pi.lineItems.length;
      
      // Mongoose array filter
      const newLineItems = [];
      for (const item of pi.lineItems) {
        if (!targetCircles.includes(item.circle)) {
          newLineItems.push(item);
        }
      }
      
      if (newLineItems.length < originalLen) {
        pi.lineItems = newLineItems;
        
        // Recalculate totals
        let subTotal = 0;
        let taxAmount = 0;
        let total = 0;

        for (const item of pi.lineItems) {
          const itemAmount = item.amount || (item.quantity * item.rate) || 0;
          subTotal += itemAmount;
          
          let cgstAmt = 0;
          let sgstAmt = 0;
          let igstAmt = 0;
          
          if (item.gstType === 'Intra State') {
            cgstAmt = itemAmount * ((item.cgst || 0) / 100);
            sgstAmt = itemAmount * ((item.sgst || 0) / 100);
          } else if (item.gstType === 'Inter State') {
            igstAmt = itemAmount * ((item.igst || 0) / 100);
          } else {
             // Fallback
             cgstAmt = itemAmount * ((item.cgst || 0) / 100);
             sgstAmt = itemAmount * ((item.sgst || 0) / 100);
             igstAmt = itemAmount * ((item.igst || 0) / 100);
          }
          
          const itemTax = cgstAmt + sgstAmt + igstAmt;
          taxAmount += itemTax;
          total += itemAmount + itemTax;
        }

        pi.subTotal = subTotal;
        pi.taxAmount = taxAmount;
        pi.total = total;
        
        // Also update balanceDue assuming amountPaid hasn't changed, but be careful not to make it negative
        if (pi.balanceDue !== undefined && pi.amountPaid !== undefined) {
          pi.balanceDue = Math.max(0, pi.total - pi.amountPaid);
        }

        await pi.save();
        updatedPIs++;
      }
    }
    console.log(`Updated ${updatedPIs} Purchase Invoices (removed Rampur/Rohru items).`);

    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
