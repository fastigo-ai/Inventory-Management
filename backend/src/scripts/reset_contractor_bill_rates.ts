import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function resetContractorBillRates() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to MongoDB for resetting contractor bill rates...");

  const col = mongoose.connection.db!.collection('contractorinvoices');

  // Find all invoices with billingCategory === 'Contractor Bill'
  const contractorBills = await col.find({ billingCategory: 'Contractor Bill' }).toArray();
  console.log(`Found ${contractorBills.length} Contractor Bill(s) to reset.`);

  let updatedCount = 0;
  for (const bill of contractorBills) {
    const updatedLineItems = (bill.lineItems || []).map((item: any) => ({
      ...item,
      rate: 0,
      baseAmount: 0,
      gstAmount: 0,
      totalAmount: 0,
      legacyData: {
        ...(item.legacyData || {}),
        finalBillAmount: 0
      }
    }));

    await col.updateOne(
      { _id: bill._id },
      {
        $set: {
          lineItems: updatedLineItems,
          totalBaseAmount: 0,
          totalGstAmount: 0,
          grandTotal: 0
        }
      }
    );
    console.log(`Reset invoice ${bill.invoiceNumber} (${bill._id}): ${updatedLineItems.length} line items.`);
    updatedCount++;
  }

  console.log(`Successfully reset rate and amount on ${updatedCount} Contractor Bill(s).`);
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

resetContractorBillRates().catch(console.error);
