import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./.env') });

async function fixGstRates() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to MongoDB for fixing GST rates to 18%...');

  const invoiceCol = mongoose.connection.db!.collection('contractorinvoices');
  const allInvoices = await invoiceCol.find({}).toArray();
  console.log(`Found ${allInvoices.length} contractor & erection invoice(s).`);

  let updatedInvoicesCount = 0;

  for (const inv of allInvoices) {
    let stagePct = 100;
    if (inv.stage && !inv.stage.includes('Advance') && !inv.stage.includes('Amount') && !inv.stage.includes('Adhoc')) {
      const parsed = parseInt(inv.stage.replace('%', ''));
      if (!isNaN(parsed) && parsed > 0) stagePct = parsed;
    }

    let needsUpdate = false;
    let totalBaseAmount = 0;
    let totalGstAmount = 0;

    const updatedLineItems = (inv.lineItems || []).map((item: any) => {
      const qty = Number(item.erectedQty > 0 ? item.erectedQty : (item.jmcDoneQty || 0));
      const rate = Number(item.rate || 0);

      // Full 100% Base Price
      let fullBasePrice = Number((qty * rate).toFixed(2));
      if (fullBasePrice <= 0 && Number(item.baseAmount) > 0) {
        fullBasePrice = stagePct > 0 && stagePct < 100 
          ? Number((Number(item.baseAmount) / (stagePct / 100)).toFixed(2))
          : Number(item.baseAmount);
      }

      // Payable base amount at stage %
      const baseAmount = (stagePct === 100 || inv.stage === 'Amount' || inv.stage === 'Advance' || inv.stage === 'Adhoc')
        ? fullBasePrice
        : Number((fullBasePrice * (stagePct / 100)).toFixed(2));

      // Rule: GST rate is strictly 18%, calculated on 100% of Base Price
      const gstRate = 18;
      const gstAmount = Number((fullBasePrice * 0.18).toFixed(2));
      const totalAmount = Number((baseAmount + gstAmount).toFixed(2));

      if (item.gstRate !== 18 || Math.abs((item.gstAmount || 0) - gstAmount) > 0.05) {
        needsUpdate = true;
      }

      totalBaseAmount += baseAmount;
      totalGstAmount += gstAmount;

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
    const grandTotal = Number((totalBaseAmount + totalGstAmount).toFixed(2));

    if (needsUpdate || inv.totalGstAmount !== totalGstAmount || inv.grandTotal !== grandTotal) {
      await invoiceCol.updateOne(
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
      console.log(`Updated invoice ${inv.invoiceNumber}: totalBase=${totalBaseAmount}, totalGst=${totalGstAmount}, grandTotal=${grandTotal}`);
      updatedInvoicesCount++;
    }
  }

  console.log(`Updated ${updatedInvoicesCount} contractor/erection invoice(s).`);

  // Now verify and fix Client Bills
  const clientBillCol = mongoose.connection.db!.collection('clientbills');
  const allClientBills = await clientBillCol.find({}).toArray();
  console.log(`Found ${allClientBills.length} client bill(s).`);

  let updatedClientBillsCount = 0;

  for (const bill of allClientBills) {
    let needsUpdate = false;
    const stage = bill.stage;
    const billType = bill.billType;

    const updatedItems = (bill.items || []).map((item: any) => {
      const qty = Number(item.raBillQty || 0);
      const rate = Number(item.boqRate || 0);
      const fullBase = qty * rate;

      const hasGst = (billType === 'Supply' && stage === '60%') || (billType === 'Erection' && stage === '90%');
      const expectedGst = hasGst ? Number((fullBase * 0.18).toFixed(2)) : 0;

      if (Math.abs((item.gstAmount || 0) - expectedGst) > 0.05) {
        needsUpdate = true;
      }

      return {
        ...item,
        gstAmount: expectedGst
      };
    });

    if (needsUpdate) {
      await clientBillCol.updateOne(
        { _id: bill._id },
        {
          $set: {
            items: updatedItems
          }
        }
      );
      console.log(`Updated client bill ${bill.raBillNo}`);
      updatedClientBillsCount++;
    }
  }

  console.log(`Updated ${updatedClientBillsCount} client bill(s).`);
  await mongoose.disconnect();
  console.log('Finished fixing GST rates to 18% across all bills.');
}

fixGstRates().catch(console.error);
