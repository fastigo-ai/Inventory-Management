const mongoose = require('mongoose');

async function calculateTotals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0");
    const db = mongoose.connection;
    const collection = db.collection('purchaseinvoices');
    
    // Find all invoices where total is 0 or doesn't exist
    const invoices = await collection.find({ $or: [{ total: 0 }, { total: { $exists: false } }, { total: null }] }).toArray();
    console.log(`Found ${invoices.length} invoices to calculate.`);
    
    let updatedCount = 0;
    
    for (const invoice of invoices) {
      if (!invoice.lineItems || invoice.lineItems.length === 0) continue;
      
      let invoiceSubTotal = 0;
      let invoiceTaxAmount = 0;
      let invoiceTotal = 0;
      
      const updatedLineItems = invoice.lineItems.map(item => {
        const amount = item.amount || 0;
        const cgstAmount = (amount * (item.cgst || 0)) / 100;
        const sgstAmount = (amount * (item.sgst || 0)) / 100;
        const igstAmount = (amount * (item.igst || 0)) / 100;
        
        const lineTax = cgstAmount + sgstAmount + igstAmount;
        const lineTotal = amount + lineTax;
        
        invoiceSubTotal += amount;
        invoiceTaxAmount += lineTax;
        invoiceTotal += lineTotal;
        
        return {
          ...item,
          totalAmount: lineTotal
        };
      });
      
      await collection.updateOne(
        { _id: invoice._id },
        { 
          $set: { 
            lineItems: updatedLineItems,
            subTotal: invoiceSubTotal,
            taxAmount: invoiceTaxAmount,
            total: invoiceTotal
          } 
        }
      );
      
      updatedCount++;
    }
    
    console.log(`Successfully calculated and updated ${updatedCount} invoices.`);
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

calculateTotals();
