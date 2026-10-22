import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function recalculateHistoricalBills() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to MongoDB for recalculating historical bills...");

  const col = mongoose.connection.db!.collection('contractorinvoices');

  // Find all Contractor and Erection Bills that have line items
  const invoices = await col.find({}).toArray();
  console.log(`Found ${invoices.length} bill(s) to recalculate.`);

  let updatedCount = 0;

  for (const inv of invoices) {
    let stagePct = 90;
    if (inv.stage && !inv.stage.includes('Advance') && !inv.stage.includes('Amount') && !inv.stage.includes('Adhoc')) {
      const parsed = parseInt(inv.stage.replace('%', ''));
      if (!isNaN(parsed) && parsed > 0) stagePct = parsed;
    }

    let totalBaseAmount = 0;
    let totalGstAmount = 0;
    let totalGrandAmount = 0;

    const updatedLineItems = (inv.lineItems || []).map((item: any) => {
      const qty = Number(item.erectedQty > 0 ? item.erectedQty : (item.jmcDoneQty || 0));
      const rate = Number(item.rate || 0);

      // Base Price = Rate * Quantity (100% full value)
      let fullBasePrice = Number((qty * rate).toFixed(2));
      
      // Fallback if rate or qty wasn't set but baseAmount exists
      if (fullBasePrice <= 0 && Number(item.baseAmount) > 0) {
        fullBasePrice = Number(item.baseAmount);
      }

      // Resolve GST Rate % (handle historical decimal like 0.18 -> 18)
      let rawGst = Number(item.gstRate !== undefined ? item.gstRate : 18);
      let gstRate = 18;
      if (rawGst > 0 && rawGst <= 1) {
        gstRate = Math.round(rawGst * 100);
      } else if (rawGst > 1 && rawGst <= 28) {
        gstRate = rawGst;
      }

      // GST Amount = 100% of Base Price * (GST % / 100)
      const gstAmount = Number((fullBasePrice * (gstRate / 100)).toFixed(2));
      
      // Rule: Taxable Base = Base Price + GST (100%)
      const baseAmount = Number((fullBasePrice + gstAmount).toFixed(2));

      // Rule: Total Amount = Stage % of Taxable Base
      const totalAmount = Number((baseAmount * (stagePct / 100)).toFixed(2));

      totalBaseAmount += baseAmount;
      totalGstAmount += gstAmount;
      totalGrandAmount += totalAmount;

      return {
        ...item,
        rate,
        percentageApplied: stagePct,
        baseAmount,
        gstRate,
        gstAmount,
        totalAmount
      };
    });

    totalBaseAmount = Number(totalBaseAmount.toFixed(2));
    totalGstAmount = Number(totalGstAmount.toFixed(2));
    const grandTotal = Number(totalGrandAmount.toFixed(2));

    await col.updateOne(
      { _id: inv._id },
      {
        $set: {
          lineItems: updatedLineItems,
          totalBaseAmount,
          totalGstAmount,
          grandTotal
        }
      }
    );

    console.log(`Updated ${inv.invoiceNumber}: Base=${totalBaseAmount}, GST=${totalGstAmount}, GrandTotal=${grandTotal}`);
    updatedCount++;
  }

  console.log(`\nSuccessfully updated all ${updatedCount} historical Erection Bill(s).`);
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

recalculateHistoricalBills().catch(console.error);
