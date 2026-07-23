const fs = require('fs');
let content = fs.readFileSync('backend/src/modules/purchases/pr.controller.ts', 'utf8');

if (!content.includes('import mongoose')) {
    content = content.replace("import { StoreInwardEntry } from '../store/storeInwardEntry.schema';", "import { StoreInwardEntry } from '../store/storeInwardEntry.schema';\nimport mongoose from 'mongoose';\nimport { SummaryService } from '../reports/summary/summary.service';");
}

const createRegex = /export const createPurchaseReceive = async \(req: Request, res: Response\): Promise<void> => \{[\s\S]*?res\.status\(500\)\.json\(\{[\s\S]*?\}\);\n  \}\n\};\n/m;
const createReplacement = `export const createPurchaseReceive = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const prData = req.body;
    
    if (!prData.purchaseReceiveNumber) {
      const count = await Pr.countDocuments();
      prData.purchaseReceiveNumber = \`PR-\${String(count + 1).padStart(5, '0')}\`;
    }

    const [newPr] = await Pr.create([prData], { session });

    if (newPr.lineItems && newPr.lineItems.length > 0) {
      const inwardEntries = newPr.lineItems.map((item: any) => ({
        purchaseInvoiceId: newPr._id,
        purchaseOrderId: newPr.purchaseOrderId,
        poNumber: newPr.purchaseOrderNumber,
        poDate: item.poDate,
        billingFrom: newPr.billingFrom,
        vendorName: newPr.vendorName,
        invoiceNumber: newPr.purchaseReceiveNumber,
        invoiceDate: newPr.receiveDate,
        diRefNo: newPr.diNo,
        circle: item.circle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.invoiceQuantity,
        totalQty: item.totalInvoiceQuantity,
        rate: item.rate,
        amount: item.totalAmount || item.amount,
        tempCode: item.tempCode,
        itemId: item.itemId,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        hsnCode: item.hsnCode,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        taxableAmount: item.amount,
        serialNumber: item.loaSerialNo,
        status: 'PENDING_RECEIPT',
        packingList: [{ packType: 'BOX', quantity: item.invoiceQuantity || 0 }]
      }));
      await StoreInwardEntry.insertMany(inwardEntries, { session });

      for (const item of newPr.lineItems) {
        if (!item.itemId) continue;
        await SummaryService.updateSummary({
          itemId: item.itemId.toString(),
          circle: item.circle,
          package: item.package,
          increments: { 
            invQty: item.invoiceQuantity || 0,
            actQty: item.act || 0,
            srtQty: item.srt || 0
          },
          session
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: newPr
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating Purchase Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Purchase Invoice',
      error: error.message
    });
  }
};
`;

content = content.replace(createRegex, createReplacement);

fs.writeFileSync('backend/src/modules/purchases/pr.controller.ts', content);
console.log('Successfully updated createPurchaseReceive with transactions');
