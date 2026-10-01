import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ClientBill } from '../src/modules/client-billing/clientBill.schema';
import { updateClientLedgerOnApproval } from '../src/modules/client-billing/clientBillingLedger.utils';
import '../src/modules/items/item.schema';
import '../src/modules/client-billing/clientBillingLedger.schema';

dotenv.config();
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory-management';

async function approveSolanBills() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const bills = await ClientBill.find({
      circle: { $in: ['Solan', 'Kumarhatti', 'Nalagarh', 'solan', 'kumarhatti', 'nalagarh'] },
      status: 'Pending PM Approval'
    });

    console.log(`Found ${bills.length} bills to approve.`);

    let success = 0;
    for (const bill of bills) {
      try {
        bill.status = 'Approved';
        bill.pmApprovedAt = new Date();
        bill.pdApprovedAt = new Date();
        
        await updateClientLedgerOnApproval(bill);
        await bill.save();
        success++;
      } catch (err: any) {
        console.error(`Failed to approve bill ${bill.raBillNo}:`, err.message);
      }
    }

    console.log(`Successfully approved ${success} bills.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

approveSolanBills();
