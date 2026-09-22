import mongoose, { ClientSession } from 'mongoose';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import { ApiError } from '../../core/utils/ApiError';

export const applyDemandQtyToWorkOrder = async (
  workOrderId: string | mongoose.Types.ObjectId,
  drawingNumber: string,
  itemsToDemand: any[],
  session: ClientSession,
  isReverting = false
) => {
  const wo = await ContractorWorkOrder.findById(workOrderId).session(session);
  if (!wo) throw new ApiError(404, 'Work Order not found');

  const drawingExists = wo.drawings.some((d: any) => d.drawingNumber === drawingNumber);
  if (!drawingExists) {
    throw new ApiError(400, `Drawing Number ${drawingNumber} not found on Work Order`);
  }

  for (const requestedItem of itemsToDemand) {
    const qtyChange = Number(requestedItem.demandQty) || 0;
    if (qtyChange === 0) continue;

    const actualChange = isReverting ? -qtyChange : qtyChange;

    const woItem = wo.items.find((i: any) => 
      String(i.itemId) === String(requestedItem.itemId) &&
      i.tempCode === requestedItem.tempCode &&
      i.activity === requestedItem.activity &&
      i.loaSrNo === (requestedItem.loaSrNo || requestedItem.loaSerialNo)
    );

    if (!woItem) {
      throw new ApiError(400, `Item ${requestedItem.tempCode} not found in Work Order`);
    }

    if (!isReverting) {
      const available = (woItem.woQty || 0) - (woItem.demandedQty || 0);
      if (qtyChange > available) {
        throw new ApiError(400, `Quantity exceeded for ${requestedItem.tempCode}. Available: ${available}, Requested: ${qtyChange}`);
      }
    }

    woItem.demandedQty = (woItem.demandedQty || 0) + actualChange;
  }

  await wo.save({ session });
};
