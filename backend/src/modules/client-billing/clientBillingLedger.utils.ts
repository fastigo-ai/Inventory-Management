import { ClientBillingLedger } from './clientBillingLedger.schema';
import mongoose from 'mongoose';

export const validateClientLedgerLimits = async (circle: string, packageStr: string, items: any[], billType: string, stage: string, excludeBillId?: string) => {
  // If no items, nothing to validate
  if (!items || items.length === 0) return { valid: true };

  const ledger = await ClientBillingLedger.findOne({ circle, package: packageStr });
  if (!ledger) {
    // If ledger doesn't exist, we assume they can bill the initial stages (Supply 60%, Erection 90%)
    if (stage === '30%' || stage === '10%') {
      return { valid: false, message: `Cannot bill ${stage} before previous stages have been approved.` };
    }
    return { valid: true };
  }

  // Check each item
  for (const item of items) {
    const itemIdStr = item.itemId?.toString() || '';
    const loaSrNoStr = item.loaSrNo?.toString() || '';
    
    // Skip items without IDs
    if (!itemIdStr) continue;

    const ledgerItem = ledger.items.find(i => i.itemId.toString() === itemIdStr && i.loaSrNo === loaSrNoStr);
    
    const reqQty = Number(item.raBillQty) || 0;
    
    if (!ledgerItem) {
      if (stage === '30%' || stage === '10%') {
        return { valid: false, message: `Item ${item.itemName} (${item.loaSrNo}) has not been billed in previous stages.` };
      }
      continue;
    }

    // Supply 30% limit check
    if (billType === 'Supply' && stage === '30%') {
      if (reqQty + ledgerItem.supplyQty30 > ledgerItem.supplyQty60) {
        return { valid: false, message: `Requested Supply 30% quantity for ${item.itemName} (${reqQty}) plus already billed (${ledgerItem.supplyQty30}) exceeds approved Supply 60% quantity (${ledgerItem.supplyQty60}).` };
      }
    }
    
    // Supply 10% limit check
    if (billType === 'Supply' && stage === '10%') {
      if (reqQty + ledgerItem.supplyQty10 > ledgerItem.supplyQty30) {
        return { valid: false, message: `Requested Supply 10% quantity for ${item.itemName} (${reqQty}) plus already billed (${ledgerItem.supplyQty10}) exceeds approved Supply 30% quantity (${ledgerItem.supplyQty30}).` };
      }
    }
    
    // Erection 10% limit check
    if (billType === 'Erection' && stage === '10%') {
      if (reqQty + ledgerItem.erectionQty10 > ledgerItem.erectionQty90) {
        return { valid: false, message: `Requested Erection 10% quantity for ${item.itemName} (${reqQty}) plus already billed (${ledgerItem.erectionQty10}) exceeds approved Erection 90% quantity (${ledgerItem.erectionQty90}).` };
      }
    }
  }

  return { valid: true };
};

export const updateClientLedgerOnApproval = async (bill: any) => {
  if (!bill.items || bill.items.length === 0) return;

  const filter = { circle: bill.circle, package: bill.package };
  let ledger = await ClientBillingLedger.findOne(filter);
  
  if (!ledger) {
    ledger = new ClientBillingLedger({
      circle: bill.circle,
      package: bill.package,
      items: []
    });
  }

  for (const item of bill.items) {
    const itemIdStr = item.itemId?.toString();
    const loaSrNoStr = item.loaSrNo?.toString() || '';
    if (!itemIdStr) continue;

    let ledgerItem = ledger.items.find(i => i.itemId.toString() === itemIdStr && i.loaSrNo === loaSrNoStr);
    
    if (!ledgerItem) {
      ledgerItem = {
        itemId: new mongoose.Types.ObjectId(itemIdStr),
        loaSrNo: loaSrNoStr,
        tempCode: item.tempCode || '',
        supplyQty60: 0,
        supplyQty30: 0,
        supplyQty10: 0,
        erectionQty90: 0,
        erectionQty10: 0,
        lastBilledAt: new Date()
      };
      ledger.items.push(ledgerItem);
    }
    
    // Add to ledger quantities
    const qty = Number(item.raBillQty) || 0;
    
    if (bill.billType === 'Supply') {
      if (bill.stage === '60%') ledgerItem.supplyQty60 += qty;
      else if (bill.stage === '30%') ledgerItem.supplyQty30 += qty;
      else if (bill.stage === '10%') ledgerItem.supplyQty10 += qty;
    } else if (bill.billType === 'Erection') {
      if (bill.stage === '90%') ledgerItem.erectionQty90 += qty;
      else if (bill.stage === '10%') ledgerItem.erectionQty10 += qty;
    }
    
    ledgerItem.lastBilledAt = new Date();
  }

  await ledger.save();
};
