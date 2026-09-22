import mongoose from 'mongoose';
import { ContractorAssignment } from './contractorAssignment.schema';
import { WipRegister } from '../wip/wip.schema';
import { JmcRegister } from '../jmc/jmc.schema';

export const calculateContractorLiability = async (contractorId: string | mongoose.Types.ObjectId, workOrderId?: string | mongoose.Types.ObjectId) => {
  const query: any = { contractorId, status: { $ne: 'Rejected' } };
  const assignQuery: any = { contractorId, status: 'Sent' };
  
  if (workOrderId) {
    query.workOrderId = workOrderId;
    assignQuery.workOrderId = workOrderId;
  }

  const [assignments, wipRecords, jmcRecords] = await Promise.all([
    ContractorAssignment.find(assignQuery).lean(),
    WipRegister.find(query).lean(),
    JmcRegister.find(query).lean()
  ]);

  const map: Record<string, { tillIssued: number; wipConsumed: number; jmcDone: number }> = {};

  const getKey = (drawingNumber: any, tempCode: any, activity: any, loaSrNo: any) => {
    return `${String(drawingNumber || '').trim().toLowerCase()}_${String(tempCode || '').trim().toLowerCase()}_${String(activity || '').trim().toLowerCase()}_${String(loaSrNo || '').trim().toLowerCase()}`;
  };

  assignments.forEach(assignment => {
    assignment.lineItems?.forEach((item: any) => {
      const key = getKey(assignment.drawingNumber, item.tempCode, item.activity, item.loaSrNo || item.loaSerialNo);
      if (!map[key]) map[key] = { tillIssued: 0, wipConsumed: 0, jmcDone: 0 };
      map[key].tillIssued += (Number(item.quantity) || 0);
    });
  });

  wipRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const key = getKey(record.drawingNumber, item.tempCode || item.materialCode, item.activity, item.loaSerialNo || item.loaSrNo);
      if (!map[key]) map[key] = { tillIssued: 0, wipConsumed: 0, jmcDone: 0 };
      map[key].wipConsumed += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  jmcRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const key = getKey(record.drawingNumber, item.tempCode || item.materialCode, item.activity, item.loaSerialNo || item.loaSrNo);
      if (!map[key]) map[key] = { tillIssued: 0, wipConsumed: 0, jmcDone: 0 };
      map[key].jmcDone += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  return map;
};
