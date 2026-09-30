const fs = require('fs');
let code = fs.readFileSync('src/modules/client-billing/clientBill.controller.ts', 'utf8');

const targetStr = `  for (const [raBillNo, billRows] of Object.entries(billGroups)) {
    try {
      // Determine Bill Type and Stage from first row`;

const replacement = `  const finalBillsToInsert: any[] = [];

  for (const [raBillNo, billRows] of Object.entries(billGroups)) {
    try {
      // Determine Bill Type and Stage from first row`;

code = code.replace(targetStr, replacement);

const targetInsertLogic = `      const clientBill = new ClientBill({
        raBillNo,
        raBillDate: new Date(),
        billType,
        stage,
        referenceType,
        referenceIds,
        items,
        circle: assignedCircle,
        package: assignedPackage,
        createdBy: user._id,
        status: 'Pending PM Approval'
      });

      await clientBill.save();
      results.success++;

    } catch (err: any) {
      results.failed++;
      results.errors.push({ raBillNo, reason: err.message });
    }
  }

  return res.status(200).json(new ApiResponse(200, results, 'Bulk import completed'));`;

const replaceInsertLogic = `      finalBillsToInsert.push({
        raBillNo,
        raBillDate: new Date(),
        billType,
        stage,
        referenceType,
        referenceIds,
        items,
        circle: assignedCircle,
        package: assignedPackage,
        createdBy: user._id,
        status: 'Pending PM Approval'
      });

    } catch (err: any) {
      results.failed++;
      results.errors.push({ raBillNo, reason: err.message });
    }
  }

  if (results.errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Import failed due to validation errors. No bills were imported.',
      data: { errors: results.errors }
    });
  }

  try {
    if (finalBillsToInsert.length > 0) {
      await ClientBill.insertMany(finalBillsToInsert);
      results.success = finalBillsToInsert.length;
    }
    return res.status(200).json(new ApiResponse(200, results, 'Bulk import completed successfully'));
  } catch (err: any) {
    return res.status(500).json(new ApiResponse(500, null, 'Database error during import: ' + err.message));
  }`;

code = code.replace(targetInsertLogic, replaceInsertLogic);

fs.writeFileSync('src/modules/client-billing/clientBill.controller.ts', code);
console.log("Patched successfully!");
