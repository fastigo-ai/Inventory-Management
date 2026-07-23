const fs = require('fs');
let content = fs.readFileSync('backend/src/modules/purchases/purchaseInvoice.controller.ts', 'utf8');

if (!content.includes('import mongoose')) {
    content = content.replace("import { StoreInwardEntry } from '../store/storeInwardEntry.schema';", "import { StoreInwardEntry } from '../store/storeInwardEntry.schema';\nimport mongoose from 'mongoose';\nimport { SummaryService } from '../reports/summary/summary.service';");
}

const createRegex = /export const createPurchaseInvoice = async \(req: Request, res: Response\) => \{[\s\S]*?res\.status\(500\)\.json\(\{[\s\S]*?\}\);\n  \}\n\};\n/m;
const createReplacement = `export const createPurchaseInvoice = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const data = req.body;
    
    let parsedLineItems = data.lineItems || [];
    if (typeof parsedLineItems === 'string') {
      try { parsedLineItems = JSON.parse(parsedLineItems); } catch (e) { parsedLineItems = []; }
    }

    const files = req.files as Express.Multer.File[];
    const attachments = files ? files.map((file: any) => ({
      name: file.originalname,
      url: \`/uploads/purchases/invoices/\${file.filename}\`
    })) : [];

    let calculatedSubTotal = 0;
    const processedLineItems = parsedLineItems.map((item: any) => {
      const amount = (item.quantity || 0) * (item.rate || 0);
      calculatedSubTotal += amount;
      return { ...item, amount };
    });

    const discountAmount = (calculatedSubTotal * (data.discountPercentage || 0)) / 100;
    const taxableAmount = calculatedSubTotal - discountAmount;
    
    const cgstAmountVal = (taxableAmount * (Number(data.cgstPercentage) || 0)) / 100;
    const sgstAmountVal = (taxableAmount * (Number(data.sgstPercentage) || 0)) / 100;
    const igstAmountVal = (taxableAmount * (Number(data.igstPercentage) || 0)) / 100;

    const adjustment = Number(data.adjustment) || 0;
    const calculatedTotal = taxableAmount + cgstAmountVal + sgstAmountVal + igstAmountVal + adjustment;

    const [newInvoice] = await PurchaseInvoice.create([{
      ...data,
      lineItems: processedLineItems,
      subTotal: calculatedSubTotal,
      discountAmount,
      total: calculatedTotal,
      status: data.status || 'Draft',
      attachments
    }], { session });

    if (processedLineItems && processedLineItems.length > 0) {
      const inwardEntries = processedLineItems.map((item: any) => ({
        purchaseInvoiceId: newInvoice._id,
        purchaseOrderId: newInvoice.purchaseOrderId,
        poNumber: data.poNumber,
        poDate: data.poDate,
        billingFrom: data.billingFrom,
        vendorName: data.vendorName,
        invoiceNumber: newInvoice.invoiceNumber,
        invoiceDate: newInvoice.date,
        diRefNo: (newInvoice as any).diNumber,
        circle: item.circle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.quantity,
        rate: item.rate,
        amount: item.amount,
        tempCode: item.tempCode,
        itemId: item.itemId,
        itemName: item.itemName,
        hsnCode: item.hsnCode,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        taxableAmount: item.amount,
        serialNumber: item.loaSerialNo,
        status: 'PENDING_RECEIPT',
        packingList: [{ packType: 'BOX', quantity: item.quantity }]
      }));
      await StoreInwardEntry.insertMany(inwardEntries, { session });

      for (const item of processedLineItems) {
        if (!item.itemId) continue;
        await SummaryService.updateSummary({
          itemId: item.itemId.toString(),
          circle: item.circle,
          package: item.package,
          increments: { billedQty: item.quantity || 0 },
          session
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: newInvoice,
      message: 'Purchase Invoice created successfully',
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Invoice Number already exists' });
    }
    console.error('Error creating Purchase Invoice:', error);
    res.status(500).json({ success: false, message: 'Failed to create Purchase Invoice', error: error.message });
  }
};
`;

content = content.replace(createRegex, createReplacement);

fs.writeFileSync('backend/src/modules/purchases/purchaseInvoice.controller.ts', content);
console.log('Successfully updated createPurchaseInvoice with transactions');
