import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { ContractorInvoice } from '../modules/contractor-billing/contractorInvoice.schema';
import { Contractor } from '../modules/contractors/contractor.schema';
import { ContractorAssignment } from '../modules/contractors/contractorAssignment.schema';

async function main() {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected to DB');

  const totalInvoices = await ContractorInvoice.countDocuments();
  console.log('Total contractor invoices:', totalInvoices);

  const sampleInvoices = await ContractorInvoice.find({}).limit(10).lean();
  for (const inv of sampleInvoices) {
    let c = null;
    if (inv.contractorId) {
      c = await Contractor.findById(inv.contractorId).lean();
    }
    console.log({
      invoiceNumber: inv.invoiceNumber,
      billingCategory: inv.billingCategory,
      contractorId: inv.contractorId,
      contractorNameInDoc: (c as any)?.name,
      contractorCompanyName: (c as any)?.dynamicData?.companyName || (c as any)?.dynamicData?.name,
      legacyBilledBy: inv.legacyMetadata?.billedBy,
      status: inv.status,
      grandTotal: inv.grandTotal
    });
  }

  const sampleMins = await ContractorAssignment.find({}).limit(5).lean();
  for (const m of sampleMins) {
    console.log({
      minNumber: (m as any).assignmentNumber || (m as any).minNumber,
      contractorFarmName: m.contractorFarmName,
      contractorId: (m as any).contractorId
    });
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
