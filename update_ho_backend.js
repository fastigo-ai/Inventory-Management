const fs = require('fs');
const path = './backend/src/modules/contractors/contractorWorkOrder.controller.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /export const handoverWorkOrder = asyncHandler.*?\}\);/s;
const newFunc = `export const handoverWorkOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { assignments, materialDisposition } = req.body;
  // assignments is expected to be an array of objects: { itemIndex: number, contractorId: string } or a map { [itemIndex: string]: string }

  if (!mongoose.Types.ObjectId.isValid(id as string)) throw new ApiError(400, 'Invalid Work Order ID');

  const oldWo = await ContractorWorkOrder.findById(id).lean();
  if (!oldWo) throw new ApiError(404, 'Work Order not found');

  if (oldWo.handoverStatus !== 'Active') {
    throw new ApiError(400, 'Work Order is not Active');
  }

  // Normalize assignments to a Map of itemIndex -> contractorId
  const assignmentMap = new Map<number, string>();
  if (Array.isArray(assignments)) {
    assignments.forEach(a => {
      if (a.contractorId && a.itemIndex !== undefined) {
        assignmentMap.set(Number(a.itemIndex), String(a.contractorId));
      }
    });
  } else if (assignments && typeof assignments === 'object') {
    Object.keys(assignments).forEach(k => {
      if (assignments[k]) {
        assignmentMap.set(Number(k), String(assignments[k]));
      }
    });
  }

  // 1. Calculate Ledger
  const ledgerMap = await calculateContractorLiability(oldWo.contractorId.toString(), id as string);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const returnItems: any[] = [];
    
    // Grouping structure for new contractors
    const newWoItemsByContractor: Record<string, any[]> = {};
    const transferItemsByContractor: Record<string, any[]> = {};
    const contractorCache: Record<string, any> = {};

    for (let i = 0; i < oldWo.items.length; i++) {
      const item = oldWo.items[i];
      const assignedContractorId = assignmentMap.get(i);
      
      const keyPrefix = \`_\${item.tempCode?.toLowerCase()}_\${item.activity?.toLowerCase()}_\${item.loaSrNo?.toLowerCase()}\`;
      
      let jmcDone = 0;
      let unerected = 0;

      for (const drawing of oldWo.drawings) {
        const key = \`\${drawing.drawingNumber.toLowerCase()}\${keyPrefix}\`;
        const liability = ledgerMap[key] || { tillIssued: 0, wipConsumed: 0, jmcDone: 0 };
        jmcDone += liability.jmcDone;
        unerected += (liability.tillIssued - liability.wipConsumed - liability.jmcDone);
      }

      const remainingWork = (item.woQty || 0) - jmcDone;
      
      // Old contractor must return any unerected material regardless of assignment
      if (unerected > 0) {
        const transferObj = {
          itemId: item.itemId,
          tempCode: item.tempCode,
          itemName: item.itemName,
          activity: item.activity,
          loaSrNo: item.loaSrNo,
          quantity: unerected,
          rate: item.contractorErectionRate, 
          amount: unerected * (item.contractorErectionRate || 0)
        };
        returnItems.push(transferObj);
        
        // If assigned to a new contractor, we will create a Demand Note for them
        if (assignedContractorId && materialDisposition === 'TRANSFER_TO_NEW_CONTRACTOR') {
          if (!transferItemsByContractor[assignedContractorId]) transferItemsByContractor[assignedContractorId] = [];
          transferItemsByContractor[assignedContractorId].push(transferObj);
        }
      }

      // If assigned to a new contractor and there is remaining work, add to their new WO
      if (assignedContractorId && remainingWork > 0) {
        if (!newWoItemsByContractor[assignedContractorId]) newWoItemsByContractor[assignedContractorId] = [];
        newWoItemsByContractor[assignedContractorId].push({
          ...item,
          woQty: remainingWork,
          demandedQty: 0,
          alreadyIssuedQty: 0
        });
        
        if (!contractorCache[assignedContractorId]) {
           const con = await Contractor.findById(assignedContractorId).lean();
           if (con) contractorCache[assignedContractorId] = con;
        }
      }
    }

    // 2. Mark old WO as Handed Over
    await ContractorWorkOrder.findByIdAndUpdate(id, { handoverStatus: 'Handed Over' }, { session });

    // 3. Create Draft Return for old contractor
    if (returnItems.length > 0) {
      await ContractorReturn.create([{
        returnNumber: \`CR-\${Date.now()}\`,
        date: new Date(),
        contractorId: oldWo.contractorId,
        circle: oldWo.circle,
        package: oldWo.package,
        lineItems: returnItems,
        status: 'Draft',
        createdBy: req.user?._id
      }], { session });
    }

    // 4. Create Split Drafts for New Contractors
    const newContractorIds = Object.keys(newWoItemsByContractor);
    for (const cId of newContractorIds) {
      const itemsForWo = newWoItemsByContractor[cId];
      const itemsForDn = transferItemsByContractor[cId] || [];
      const contractorInfo = contractorCache[cId];

      if (itemsForWo.length > 0) {
        // Draft WO (Keeping the exact same workOrderNumber so it shares the ID, but technically amended)
        const newWo = await ContractorWorkOrder.create([{
          ...oldWo,
          _id: new mongoose.Types.ObjectId(),
          workOrderNumber: oldWo.workOrderNumber, 
          contractorId: cId,
          amendedFromId: oldWo._id,
          originalWorkOrderId: oldWo.originalWorkOrderId || oldWo._id,
          items: itemsForWo,
          handoverStatus: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        }], { session });

        // Draft Demand Note
        if (itemsForDn.length > 0 && contractorInfo) {
          await DemandNote.create([{
            demandNoteNumber: \`DN-\${Date.now()}-\${Math.floor(Math.random() * 1000)}\`,
            createdBy: req.user?._id,
            contractorName: contractorInfo.dynamicData?.companyName || 'Unknown',
            circle: oldWo.circle,
            package: oldWo.package,
            drawingNumber: oldWo.drawings[0]?.drawingNumber || 'MIGRATED',
            workOrderId: newWo[0]._id, 
            status: 'Draft',
            items: itemsForDn.map((item: any) => ({
              itemId: item.itemId,
              itemName: item.itemName,
              tempCode: item.tempCode,
              activity: item.activity,
              loaSrNo: item.loaSrNo,
              demandQty: item.quantity,
              stockBal: 0 
            }))
          }], { session });
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(new ApiResponse(200, null, 'Work Order handover completed successfully'));
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(500, error.message || 'Failed to complete handover');
  }
});`;

code = code.replace(regex, newFunc);
fs.writeFileSync(path, code);
console.log("Updated backend logic");
