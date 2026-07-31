import mongoose from 'mongoose';
import { PurchaseInvoice } from '../../../modules/purchases/purchaseInvoice.schema';

export interface AllocationSummary {
  originalQuantity: number;
  consumedQuantity: number;
  remainingQuantity: number;
}

export interface LineItemAllocation {
  lineId: string;
  itemId: string;
  originalQuantity: number;
  consumedQuantity: number;
  remainingQuantity: number;
}

export class AllocationService {
  /**
   * Calculates the allocation details for a given Dispatch Instruction.
   * This aggregates all Purchase Invoices that consume lines from this DI.
   */
  static async getDiAllocation(diId: string, excludePiId?: string): Promise<LineItemAllocation[]> {
    // 1. Fetch the original DI
    const di = await mongoose.model('DI').findById(diId).lean() as any;
    if (!di || !di.lineItems) return [];

    // 2. Fetch all PIs that reference this DI
    const query: any = { 'lineItems.diId': new mongoose.Types.ObjectId(diId) };
    if (excludePiId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludePiId) };
    }
    const pis = await PurchaseInvoice.find(query).lean();

    // 3. Aggregate consumed quantities per DI line
    const consumedMap = new Map<string, number>();

    for (const pi of pis) {
      for (const line of pi.lineItems as any[]) {
        if (line.diLineId && line.diId && line.diId.toString() === diId.toString()) {
          const lineIdStr = line.diLineId.toString();
          const currentConsumed = consumedMap.get(lineIdStr) || 0;
          // In PI, totalInvoiceQuantity or invoiceQuantity or quantity represents the consumed amount
          const qty = Number(line.quantity) || Number(line.invoiceQuantity) || 0;
          consumedMap.set(lineIdStr, currentConsumed + qty);
        }
      }
    }

    // 4. Build the allocation array
    const allocations: LineItemAllocation[] = di.lineItems.map((item: any) => {
      const lineIdStr = item._id.toString();
      const originalQty = Number(item.quantity) || 0;
      const consumedQty = consumedMap.get(lineIdStr) || 0;

      return {
        lineId: lineIdStr,
        itemId: item.itemId ? item.itemId.toString() : '',
        originalQuantity: originalQty,
        consumedQuantity: consumedQty,
        remainingQuantity: Math.max(0, originalQty - consumedQty)
      };
    });

    return allocations;
  }
}
