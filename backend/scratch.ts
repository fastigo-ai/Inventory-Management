import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), 'frontend', '.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-system';

const diSchema = new mongoose.Schema({}, { strict: false });
const piSchema = new mongoose.Schema({}, { strict: false });

const DI = mongoose.model('DI', diSchema, 'dis');
const PI = mongoose.model('PurchaseInvoice', piSchema, 'purchaseinvoices');

async function check() {
  await mongoose.connect(mongoUri);

  const dis = await DI.find({ diNumber: 'CEO/MM/RDSS/Loss reduction/2024-25/-22990-99' }).lean();
  console.log(`Found ${dis.length} DIs`);
  if (dis.length > 0) {
    const di: any = dis[0];
    console.log(`DI ID: ${di._id}`);
    console.log(`DI Line Items:`);
    for (const li of di.lineItems || []) {
      console.log(`  - Item: ${li.itemName}, Qty: ${li.quantity}, LineId: ${li._id}`);
    }

    const pis = await PI.find({ 'lineItems.diId': di._id }).lean();
    console.log(`\nFound ${pis.length} PIs consuming this DI`);
    let totalConsumed = 0;
    for (const pi of pis) {
      const piAny: any = pi;
      console.log(`  - PI: ${piAny.invoiceNumber}, Status: ${piAny.status}`);
      for (const li of piAny.lineItems || []) {
        if (li.diId?.toString() === di._id.toString()) {
          console.log(`      Line Qty: ${li.quantity}`);
          totalConsumed += Number(li.quantity);
        }
      }
    }
    console.log(`\nTotal Consumed: ${totalConsumed}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
