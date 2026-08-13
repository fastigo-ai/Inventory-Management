import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/sanjeet kumar/Desktop/DoortwoFy/erp-system/backend/.env' });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("No MONGO_URI");
  process.exit(1);
}

const purchaseInvoiceSchema = new mongoose.Schema({}, { strict: false });
const PurchaseInvoice = mongoose.models.PurchaseInvoice || mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);

async function checkDiQuantity() {
  try {
    await mongoose.connect(MONGO_URI as string);
    
    const invoices = await PurchaseInvoice.find({
      'lineItems': {
        $elemMatch: { diQuantity: { $gt: 0, $ne: null } }
      }
    }).select('invoiceNumber vendorName lineItems.diQuantity lineItems.itemName').lean();
    
    console.log(`Found ${invoices.length} invoices with diQuantity > 0`);
    
    if (invoices.length > 0) {
      console.log(JSON.stringify(invoices.slice(0, 5), null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDiQuantity();
