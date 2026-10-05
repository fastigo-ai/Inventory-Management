import mongoose from 'mongoose';
import { AllocationService } from '../allocation/allocation.service';

export class ValidationService {
  /**
   * Validates that the requested consumption does not exceed the remaining balance.
   * Throws an error if validation fails.
   */
  static async validateConsumption(
    sourceId: string, 
    requestedQuantities: { lineId: string, quantity: number, itemName?: string }[],
    excludePiIds?: string | string[],
    batchConsumptionMap?: Map<string, number>
  ): Promise<void> {
    const allocations = await AllocationService.getDiAllocation(sourceId, excludePiIds);
    const allocationMap = new Map(allocations.map(a => [a.lineId, a.remainingQuantity]));

    const errors: string[] = [];
    for (const req of requestedQuantities) {
      const dbRemaining = allocationMap.get(req.lineId) || 0;
      const alreadyConsumedInBatch = batchConsumptionMap ? (batchConsumptionMap.get(req.lineId) || 0) : 0;
      // Because floating point math can cause issues, round to 3 decimals
      const actualRemaining = Math.max(0, Math.round((dbRemaining - alreadyConsumedInBatch) * 1000) / 1000);
      const reqQty = Math.round(req.quantity * 1000) / 1000;
      
      if (reqQty > actualRemaining) {
        const itemStr = req.itemName ? `item "${req.itemName}"` : `line ${req.lineId}`;
        errors.push(`Allocation exceeded for ${itemStr}. Requested: ${reqQty}, Remaining: ${actualRemaining}`);
      } else {
        if (batchConsumptionMap) {
          batchConsumptionMap.set(req.lineId, alreadyConsumedInBatch + reqQty);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  }
}
