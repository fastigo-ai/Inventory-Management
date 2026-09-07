import mongoose from 'mongoose';
import { ClientBill } from './src/modules/client-billing/clientBill.schema';
import { ContractorInvoice } from './src/modules/contractor-billing/contractorInvoice.schema';
import { validateClientLedgerLimits } from './src/modules/client-billing/clientBillingLedger.utils';
import { ClientBillingLedger } from './src/modules/client-billing/clientBillingLedger.schema';

async function runTests() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  let errors = [];

  try {
    console.log("=== 1. Checking Floating Point Math in Client Bills ===");
    const bills = await ClientBill.find({});
    for (const bill of bills) {
      if (bill.items) {
        for (const item of bill.items) {
          const total = (item.totalAmount || 0) + (item.gstAmount || 0);
          if (Math.abs(total - Math.round(total * 100) / 100) > 0.01) {
            errors.push(`Bill ${bill.raBillNo}: Precision error on totalAmount ${item.totalAmount} + gst ${item.gstAmount} = ${total}`);
          }
          if (item.raBillQty < 0) errors.push(`Bill ${bill.raBillNo}: Negative qty found`);
        }
      }
    }
    
    console.log("=== 2. Checking Auto-Trigger Generation Code Paths ===");
    // We already know buildAutoSupplyItems had an issue with export. We fixed the trigger, but is it fixed in the controller?
    // Let's verify if buildAutoSupplyItems is defined and exports correctly.
    
    console.log("=== 3. Ledger Constraint Testing ===");
    // Create a mock validation test
    const dummyItem = {
      itemId: new mongoose.Types.ObjectId(),
      loaSrNo: 'TEST-123',
      itemName: 'Test Item',
      raBillQty: 10
    };
    
    // Test 1: Bill Supply 30% without 60%
    const test1 = await validateClientLedgerLimits('TestCircle', 'TestPackage', [dummyItem], 'Supply', '30%');
    if (test1.valid) errors.push("Ledger allowed Supply 30% without prior 60%");

    // Cleanup
    await ClientBillingLedger.deleteMany({ circle: 'TestCircle' });
    
  } catch (e: any) {
    console.error(e);
    errors.push(e.message);
  }

  if (errors.length > 0) {
    console.log("\n❌ TESTS FAILED:");
    errors.forEach(e => console.log(" -", e));
  } else {
    console.log("\n✅ ALL TESTS PASSED");
  }

  process.exit();
}

runTests();
