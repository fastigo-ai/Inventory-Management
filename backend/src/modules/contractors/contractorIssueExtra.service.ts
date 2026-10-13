import mongoose from 'mongoose';
import { ContractorAssignment } from './contractorAssignment.schema';
import DemandNote from '../demand-notes/demandNote.schema';
import { Contractor } from './contractor.schema';
import { SummaryService } from '../reports/summary/summary.service';
import { ApiError } from '../../core/utils/ApiError';

/**
 * Utility to generate the next Demand Note number
 */
const generateNextDemandNoteNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `DN-${year}${month}-`;

  const lastNote = await DemandNote.findOne({ demandNoteNumber: new RegExp(`^${prefix}`) })
    .sort({ demandNoteNumber: -1 })
    .limit(1);

  let sequence = 1;
  if (lastNote && lastNote.demandNoteNumber) {
    const parts = lastNote.demandNoteNumber.split('-');
    if (parts.length >= 3) {
      const lastSequence = parseInt(parts[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

/**
 * Evaluates line items during MIN create/update to flag extra items and calculate extraQty.
 */
export const processAssignmentExtraItems = (assignmentData: any) => {
  if (!assignmentData.lineItems || !Array.isArray(assignmentData.lineItems)) {
    return;
  }

  let hasExtra = false;
  assignmentData.lineItems = assignmentData.lineItems.map((item: any) => {
    const demandQty = Number(item.demandQty || 0);
    const issuedQty = Number(item.quantity || 0);
    const isExplicitExtra = Boolean(item.isExtra);
    const isOverIssued = issuedQty > demandQty;

    const isExtra = isExplicitExtra || isOverIssued;
    const extraQty = isExtra ? Math.max(0, issuedQty - demandQty) : 0;

    if (extraQty > 0) {
      hasExtra = true;
    }

    return {
      ...item,
      isExtra,
      extraQty,
      demandRegularizedQty: Number(item.demandRegularizedQty || 0),
      regularizedDemandNoteNumber: item.regularizedDemandNoteNumber || undefined,
      regularizedDemandNoteId: item.regularizedDemandNoteId || undefined,
    };
  });

  assignmentData.hasExtraItems = hasExtra;
  if (hasExtra) {
    if (assignmentData.extraRegularizationStatus !== 'Regularized') {
      assignmentData.extraRegularizationStatus = 'Pending Regularization';
    }
  } else {
    assignmentData.extraRegularizationStatus = 'None';
  }

  if (assignmentData.demandNo) {
    const linked = Array.isArray(assignmentData.linkedDemandNotes) ? [...assignmentData.linkedDemandNotes] : [];
    if (!linked.includes(assignmentData.demandNo)) {
      linked.push(assignmentData.demandNo);
    }
    assignmentData.linkedDemandNotes = linked;
  }
};

/**
 * Service to fetch unregularized extra issues for Site Portal notifications
 */
export const getUnregularizedExtraIssuesService = async (query: any, user: any) => {
  const filter: any = {
    hasExtraItems: true,
    extraRegularizationStatus: 'Pending Regularization',
    status: { $ne: 'Cancelled' },
  };

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin' || user?.role?.permissions?.includes('*');

  if (!isAdmin && user?.assignedCircle) {
    const SUB_STORE_MAP: Record<string, string[]> = {
      'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
      'Nahan': ['Nahan'],
      'Rohru': ['Rohru'],
      'Rampur': ['Rampur'],
    };
    const allowedCircles = SUB_STORE_MAP[user.assignedCircle] || [user.assignedCircle];
    const regexCircles = allowedCircles.map(c => new RegExp(`^${c}$`, 'i'));
    filter.circle = { $in: regexCircles };
  }

  if (query.circle && query.circle !== 'All') {
    filter.circle = new RegExp(`^${query.circle}$`, 'i');
  }

  const assignments = await ContractorAssignment.find(filter)
    .populate('contractorId', 'name dynamicData vendorName')
    .sort({ createdAt: -1 })
    .lean();

  let totalExtraUnits = 0;

  const result = assignments.map((a: any) => {
    const contractorName = a.contractorId?.dynamicData?.displayName || 
                          a.contractorId?.name || 
                          a.contractorFarmName || 
                          'Unknown Contractor';

    const pendingExtraItems = (a.lineItems || []).filter((li: any) => {
      const extra = Number(li.extraQty || 0);
      const regularized = Number(li.demandRegularizedQty || 0);
      return li.isExtra && (extra - regularized) > 0;
    }).map((li: any) => {
      const pendingQty = Number(li.extraQty || 0) - Number(li.demandRegularizedQty || 0);
      totalExtraUnits += pendingQty;
      return {
        itemId: li.itemId,
        itemName: li.itemName,
        tempCode: li.tempCode,
        loaSrNo: li.loaSrNo,
        unit: li.unit || 'Nos',
        demandQty: Number(li.demandQty || 0),
        issuedQty: Number(li.quantity || 0),
        extraQty: Number(li.extraQty || 0),
        pendingRegularizationQty: pendingQty,
      };
    });

    return {
      _id: a._id,
      minNo: a.minNo || a.assignmentNumber,
      assignmentNumber: a.assignmentNumber,
      minDate: a.minDate || a.date,
      demandNo: a.demandNo,
      contractorId: a.contractorId?._id || a.contractorId,
      contractorName,
      circle: a.circle,
      package: a.package,
      division: a.division,
      subDivision: a.subDivision,
      supervisorEngineer: a.supervisorEngineer,
      extraItems: pendingExtraItems,
      totalExtraItemsCount: pendingExtraItems.length,
      createdAt: a.createdAt,
    };
  }).filter((a: any) => a.extraItems.length > 0);

  return {
    unregularizedIssues: result,
    totalCount: result.length,
    totalExtraUnits,
  };
};

/**
 * Service to demand extra issued quantities from Site Portal and merge them back into the MIN
 */
export const regularizeExtraDemandService = async (
  assignmentId: string, 
  payload: { remarks?: string }, 
  user: any
) => {
  const assignment = await ContractorAssignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(404, 'Material Issue Note (MIN) not found');
  }

  if (assignment.status === 'Cancelled') {
    throw new ApiError(400, 'Cannot regularize extra items for a cancelled issue note');
  }

  // Find unregularized items
  const unregularizedItems = (assignment.lineItems || []).filter((li: any) => {
    const extra = Number(li.extraQty || 0);
    const reg = Number(li.demandRegularizedQty || 0);
    return li.isExtra && (extra - reg) > 0;
  });

  if (unregularizedItems.length === 0) {
    throw new ApiError(400, 'No pending extra items found on this MIN to regularize');
  }

  // Generate new Demand Note Number for regularization
  const demandNoteNumber = await generateNextDemandNoteNumber();

  // Contractor name resolution
  let contractorName = assignment.contractorFarmName || 'Contractor';
  if (assignment.contractorId) {
    const contractorDoc = await Contractor.findById(assignment.contractorId).lean();
    if (contractorDoc) {
      contractorName = (contractorDoc as any).dynamicData?.displayName || contractorDoc.name || contractorName;
    }
  }

  // Construct Demand Note items matching the extra quantities
  const demandNoteItems = unregularizedItems.map((li: any) => {
    const unregularizedQty = Number(li.extraQty || 0) - Number(li.demandRegularizedQty || 0);
    return {
      itemId: li.itemId,
      itemName: li.itemName,
      itemDescription: li.itemName,
      tempCode: li.tempCode,
      loaSrNo: li.loaSrNo,
      unit: li.unit || 'Nos',
      activity: li.activity || '',
      demandQty: unregularizedQty,
      alreadyIssuedQty: Number(li.quantity || 0),
    };
  });

  // Create the Regularization Demand Note
  const newDemandNote = await DemandNote.create({
    demandNoteNumber,
    createdBy: user?._id || assignment.contractorId,
    package: assignment.package || user?.assignedPackage || 'Package 1',
    circle: assignment.circle || user?.assignedCircle || 'General',
    contractorName,
    division: assignment.division,
    subDivision: assignment.subDivision,
    drawingNumber: assignment.drawingNumber || 'REGULARIZATION',
    status: 'Fulfilled', // Fulfilled because materials are already physically issued
    authorizedByEngineer: assignment.supervisorEngineer || (user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Site Engineer'),
    remarks: payload.remarks || `Regularization demand for extra quantities issued on MIN ${assignment.minNo || assignment.assignmentNumber}`,
    items: demandNoteItems,
  });

  // Now MERGE the demand into the previous MIN:
  // Update line items: demandQty now matches quantity (or absorbs the extra), and mark regularized
  assignment.lineItems = assignment.lineItems.map((li: any) => {
    const extra = Number(li.extraQty || 0);
    const reg = Number(li.demandRegularizedQty || 0);
    const unreg = extra - reg;

    if (li.isExtra && unreg > 0) {
      const base = typeof li.toObject === 'function' ? li.toObject() : { ...li };
      return {
        ...base,
        demandQty: (Number(li.demandQty) || 0) + unreg, // Increase demandQty so it balances with issued quantity
        demandRegularizedQty: extra,
        regularizedDemandNoteNumber: newDemandNote.demandNoteNumber,
        regularizedDemandNoteId: newDemandNote._id,
      };
    }
    return li;
  });

  // Update assignment status & audit timestamps
  assignment.extraRegularizationStatus = 'Regularized';
  assignment.extraRegularizedAt = new Date();
  assignment.extraRegularizedBy = user?._id;
  assignment.extraRegularizationRemarks = payload.remarks || `Regularized via Demand Note ${newDemandNote.demandNoteNumber}`;

  // Link the new Demand Note
  const linked = Array.isArray(assignment.linkedDemandNotes) ? [...assignment.linkedDemandNotes] : [];
  if (!linked.includes(newDemandNote.demandNoteNumber)) {
    linked.push(newDemandNote.demandNoteNumber);
  }
  assignment.linkedDemandNotes = linked;

  if (assignment.demandNo) {
    if (!assignment.demandNo.includes(newDemandNote.demandNoteNumber)) {
      assignment.demandNo = `${assignment.demandNo}, ${newDemandNote.demandNoteNumber}`;
    }
  } else {
    assignment.demandNo = newDemandNote.demandNoteNumber;
  }

  await assignment.save();

  // Rebuild item ledger summaries
  unregularizedItems.forEach((li: any) => {
    if (li.itemId) {
      SummaryService.rebuildForItem(li.itemId.toString()).catch(console.error);
    }
  });

  return {
    assignment,
    demandNote: newDemandNote,
  };
};
