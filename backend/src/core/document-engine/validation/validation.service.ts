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
    batchConsumptionMap?: Map<string, number>,
    preloadedAllocations?: Map<string, number>
  ): Promise<void> {
    const allocationMap = preloadedAllocations || new Map(
      (await AllocationService.getDiAllocation(sourceId, excludePiIds)).map(a => [a.lineId, a.remainingQuantity])
    );

    const errors: string[] = [];
    for (const req of requestedQuantities) {
      const dbRemaining = allocationMap.get(req.lineId) || 0;
      const alreadyConsumedInBatch = batchConsumptionMap ? (batchConsumptionMap.get(req.lineId) || 0) : 0;
      // Because floating point math can cause issues, round to 3 decimals
      const actualRemaining = Math.max(0, Math.round((dbRemaining - alreadyConsumedInBatch) * 1000) / 1000);
      const reqQty = Math.round(req.quantity * 1000) / 1000;
      
      if (reqQty > actualRemaining) {
        // Allow standard manufacturing drum tolerance for cables/wires when variance is under 0.05 km (<= 2%)
        const diff = Math.round((reqQty - actualRemaining) * 1000) / 1000;
        const isCableOrWire = req.itemName && /cable|conductor|wire|drum/i.test(req.itemName);
        const withinTolerance = isCableOrWire && (diff <= 0.05);

        if (withinTolerance) {
          if (batchConsumptionMap) {
            batchConsumptionMap.set(req.lineId, alreadyConsumedInBatch + reqQty);
          }
          continue;
        }

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
