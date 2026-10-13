import mongoose from 'mongoose';
import { ContractorAssignment } from './contractorAssignment.schema';
import { WipRegister } from '../wip/wip.schema';
import { JmcRegister } from '../jmc/jmc.schema';

export const calculateContractorLiability = async (contractorId: string | mongoose.Types.ObjectId, workOrderId?: string | mongoose.Types.ObjectId) => {
  const query: any = { contractorId, status: { $ne: 'Rejected' } };
  const assignQuery: any = { contractorId, status: { $ne: 'Cancelled' } };
  
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

  const clean = (s: any) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const norm = (s: any) => String(s || '').replace(/\s+/g, '').toLowerCase();

  const addValues = (drawingNumber: any, tempCode: any, activity: any, loaSrNo: any, type: 'tillIssued' | 'wipConsumed' | 'jmcDone', qty: number) => {
    if (!qty) return;
    const d = clean(drawingNumber);
    const t = clean(tempCode);
    const a = clean(activity);
    const aNorm = norm(activity);
    const l = clean(loaSrNo);

    const keys = new Set<string>();
    if (d && t && a && l) {
      keys.add(`${d}_${t}_${a}_${l}`);
      keys.add(`${d}_${t}_${aNorm}_${l}`);
    }
    if (t && a && l) {
      keys.add(`_${t}_${a}_${l}`);
      keys.add(`_${t}_${aNorm}_${l}`);
      keys.add(`${t}_${a}_${l}`);
      keys.add(`${t}_${aNorm}_${l}`);
    }
    if (a && l) {
      keys.add(`${a}_${l}`);
      keys.add(`${aNorm}_${l}`);
    }
    if (a && t) {
      keys.add(`${a}_${t}`);
      keys.add(`${aNorm}_${t}`);
    }
    if (l) keys.add(l);
    if (t) keys.add(t);

    keys.forEach(k => {
      if (!map[k]) map[k] = { tillIssued: 0, wipConsumed: 0, jmcDone: 0 };
      map[k][type] = Number((map[k][type] + qty).toFixed(3));
    });
  };

  assignments.forEach(assignment => {
    assignment.lineItems?.forEach((item: any) => {
      addValues(assignment.drawingNumber, item.tempCode, item.activity, item.loaSrNo || item.loaSerialNo, 'tillIssued', Number(item.quantity) || 0);
    });
  });

  wipRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const qty = Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0;
      addValues(record.drawingNumber, item.tempCode || item.materialCode, item.activity, item.loaSerialNo || item.loaSrNo, 'wipConsumed', qty);
    });
  });

  jmcRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const qty = Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0;
      addValues(record.drawingNumber, item.tempCode || item.materialCode, item.activity, item.loaSerialNo || item.loaSrNo, 'jmcDone', qty);
    });
  });

  return map;
};
