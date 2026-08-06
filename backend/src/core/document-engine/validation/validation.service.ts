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
    excludePiId?: string
  ): Promise<void> {
    const allocations = await AllocationService.getDiAllocation(sourceId, excludePiId);
    const allocationMap = new Map(allocations.map(a => [a.lineId, a.remainingQuantity]));

    for (const req of requestedQuantities) {
      const remaining = allocationMap.get(req.lineId) || 0;
      if (req.quantity > remaining) {
        const itemStr = req.itemName ? `item "${req.itemName}"` : `line ${req.lineId}`;
        throw new Error(`Allocation exceeded for ${itemStr}. Requested: ${req.quantity}, Remaining: ${remaining}`);
      }
    }
  }
}
