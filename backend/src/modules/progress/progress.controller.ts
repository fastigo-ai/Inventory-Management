import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import DemandNote from '../demand-notes/demandNote.schema';
import { Pr } from '../purchases/pr.schema';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { ContractorReturn } from '../contractors/contractorReturn.schema';
import { JmcRegister } from '../jmc/jmc.schema';
import { WipRequiredRegister } from '../wip-required/wipRequired.schema';

export const getProgressMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { package: pkg, circle } = req.query;
  const match: any = {};
  if (pkg) match.package = pkg;
  if (circle) match.circle = circle;

  // 1. Procurement Counts
  const demandNotes = await DemandNote.countDocuments(match);
  const prCreated = await Pr.countDocuments(match);
  const poCreated = await PurchaseOrder.countDocuments(match);
  const delivered = await StoreInwardEntry.countDocuments(match); // Count of inward entries

  // 2. Work Order Statuses
  const workOrders = await ContractorWorkOrder.find(match).select('status');
  const woCreated = workOrders.length;
  const woApproved = workOrders.filter(w => w.status === 'APPROVED').length;
  const woIssued = workOrders.filter(w => w.status === 'ISSUED').length;
  const woInProgress = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
  const woCompleted = workOrders.filter(w => w.status === 'COMPLETED').length;
  const woOnHold = workOrders.filter(w => w.status === 'ON_HOLD').length;
  const woCancelled = workOrders.filter(w => w.status === 'CANCELLED').length;

  // 3. JMC Statuses
  const jmcs = await JmcRegister.find(match).select('status');
  const jmcSubmitted = jmcs.length;
  const jmcVerified = jmcs.filter(j => j.status === 'VERIFIED').length;
  const jmcApproved = jmcs.filter(j => j.status === 'APPROVED').length;
  const jmcRejected = jmcs.filter(j => j.status === 'REJECTED').length;

  // 4. Material Quantities (In Memory Aggregation for simplicity)
  const inwardEntries = await StoreInwardEntry.find(match).select('itemName totalQty');
  const assignments = await ContractorAssignment.find(match).select('contractorId lineItems').populate('contractorId', 'name');
  const returns = await ContractorReturn.find(match).select('contractorId lineItems').populate('contractorId', 'name');
  const jmcRegisters = await JmcRegister.find(match).select('items');

  // Maps for aggregation
  const materialMap: Record<string, { procured: number, issued: number, consumed: number, returned: number }> = {};
  const contractorMap: Record<string, { name: string, issued: number, consumed: number, returned: number }> = {};
  
  let totalIssued = 0;
  let totalConsumed = 0;
  let totalReturned = 0;

  // Helper to init material map
  const initMaterial = (name: string) => {
    if (!name) name = 'Unknown Material';
    if (!materialMap[name]) materialMap[name] = { procured: 0, issued: 0, consumed: 0, returned: 0 };
    return name;
  };
  const initContractor = (id: string, name: string) => {
    if (!id) return;
    if (!contractorMap[id]) contractorMap[id] = { name: name || 'Unknown Contractor', issued: 0, consumed: 0, returned: 0 };
  };

  // Process Procured (Inward)
  inwardEntries.forEach(entry => {
    const name = initMaterial(entry.itemName || 'Unknown Material');
    materialMap[name].procured += (entry.totalQty || 0);
  });

  // Process Issued (Assignment)
  assignments.forEach(asgn => {
    const cId = asgn.contractorId?._id?.toString();
    const cName = (asgn.contractorId as any)?.name;
    if (cId) initContractor(cId, cName);

    asgn.lineItems?.forEach((item: any) => {
      const name = initMaterial(item.itemName);
      const qty = Number(item.quantity) || 0;
      materialMap[name].issued += qty;
      totalIssued += qty;
      if (cId) contractorMap[cId].issued += qty;
    });
  });

  // Process Consumed (JMC)
  jmcRegisters.forEach(jmc => {
    jmc.items?.forEach((item: any) => {
      const name = initMaterial(item.description || item.itemName);
      const qty = Number(item.approvedQty) || Number(item.claimedQty) || 0;
      materialMap[name].consumed += qty;
      totalConsumed += qty;
      // Ideally we track contractor in JMC, but JMC schema might not have it directly here without populate
    });
  });

  // Process Returned
  returns.forEach(ret => {
    const cId = ret.contractorId?._id?.toString();
    const cName = (ret.contractorId as any)?.name;
    if (cId) initContractor(cId, cName);

    ret.lineItems?.forEach((item: any) => {
      const name = initMaterial(item.itemName);
      const qty = Number(item.quantity) || 0;
      materialMap[name].returned += qty;
      totalReturned += qty;
      if (cId) contractorMap[cId].returned += qty;
    });
  });

  // Convert maps to arrays
  const materialMovement = Object.keys(materialMap).map(name => ({
    material: name,
    required: 0, // Placeholder, normally from WIP Required
    procured: materialMap[name].procured,
    issued: materialMap[name].issued,
    consumed: materialMap[name].consumed,
    returned: materialMap[name].returned,
    balance: materialMap[name].procured - materialMap[name].issued + materialMap[name].returned
  })).sort((a, b) => b.issued - a.issued).slice(0, 10); // Top 10

  const contractorMaterial = Object.values(contractorMap).map(c => ({
    contractor: c.name,
    issued: c.issued,
    consumed: c.consumed,
    returned: c.returned,
    balance: c.issued - c.consumed - c.returned
  })).sort((a, b) => b.issued - a.issued);

  // Return exactly what UI expects
  res.json(new ApiResponse(200, {
    procurement: {
      demandNotes,
      prCreated,
      poCreated,
      delivered
    },
    workExecution: {
      workOrders: [
        { label: 'Created', count: woCreated, pct: woCreated ? 100 : 0 },
        { label: 'Approved', count: woApproved, pct: woCreated ? Math.round((woApproved/woCreated)*100) : 0 },
        { label: 'Issued', count: woIssued, pct: woCreated ? Math.round((woIssued/woCreated)*100) : 0 },
        { label: 'In Progress', count: woInProgress, pct: woCreated ? Math.round((woInProgress/woCreated)*100) : 0 },
        { label: 'Completed', count: woCompleted, pct: woCreated ? Math.round((woCompleted/woCreated)*100) : 0 },
        { label: 'On Hold', count: woOnHold, pct: woCreated ? Math.round((woOnHold/woCreated)*100) : 0 },
        { label: 'Cancelled', count: woCancelled, pct: woCreated ? Math.round((woCancelled/woCreated)*100) : 0 }
      ],
      jmcs: [
        { label: 'Submitted', count: jmcSubmitted, pct: jmcSubmitted ? 100 : 0 },
        { label: 'Verified', count: jmcVerified, pct: jmcSubmitted ? Math.round((jmcVerified/jmcSubmitted)*100) : 0 },
        { label: 'Approved', count: jmcApproved, pct: jmcSubmitted ? Math.round((jmcApproved/jmcSubmitted)*100) : 0 },
        { label: 'Rejected', count: jmcRejected, pct: jmcSubmitted ? Math.round((jmcRejected/jmcSubmitted)*100) : 0 }
      ]
    },
    material: {
      totalIssued,
      totalConsumed,
      totalReturned,
      materialMovement,
      contractorMaterial
    },
    wip: [], // Placeholder
    exceptions: [] // Placeholder
  }, 'Progress metrics fetched successfully'));
});
