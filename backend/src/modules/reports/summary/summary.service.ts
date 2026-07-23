import mongoose, { ClientSession } from 'mongoose';
import { ItemSummary } from './summary.schema';
import Item from '../../items/item.model';

interface UpdateSummaryParams {
  itemId: string | mongoose.Types.ObjectId;
  circle?: string;
  package?: string;
  companyId?: string;
  warehouseId?: string;
  increments: {
    loaQty?: number;
    bomQty?: number;
    diQty?: number;
    invQty?: number;
    actQty?: number;
    srtQty?: number;
    billedQty?: number;
  };
  session?: ClientSession;
}

export class SummaryService {
  /**
   * Automatically updates or creates an ItemSummary record for the given dimensions.
   */
  static async updateSummary(params: UpdateSummaryParams) {
    const { itemId, circle, increments, session, companyId, warehouseId } = params;
    
    // In JS/TS 'package' is a reserved keyword, so we alias it carefully
    const pkg = params.package || '';
    const circ = circle || '';

    // Remove undefined increments
    const incObj: any = {};
    for (const [k, v] of Object.entries(increments)) {
      if (v !== undefined) {
        incObj[k] = v;
      }
    }

    if (Object.keys(incObj).length === 0) {
      return; // Nothing to increment
    }

    // Try to find if the record exists to increment, otherwise we need to get the item name for upsert.
    // Instead of querying Item every time, we can use $setOnInsert in the update.
    // But we need the item name for $setOnInsert.
    let itemName = 'Unknown Item';
    
    // It's usually safe and cheap enough to just fetch the item name if we expect to cache it or we do it rarely.
    // Given the event-driven nature, fetching item is an acceptable cost to keep summary pure.
    const item = await Item.findById(itemId).select('dynamicData').session(session || null);
    if (item && item.dynamicData && item.dynamicData.name) {
      itemName = item.dynamicData.name;
    }

    const filter: Record<string, any> = {
      itemId: new mongoose.Types.ObjectId(itemId.toString()),
      circle: circ,
      package: pkg
    };
    
    // If we have multi-tenant fields, include them in the unique key.
    if (companyId) filter['companyId'] = companyId;
    if (warehouseId) filter['warehouseId'] = warehouseId;

    const update = {
      $inc: incObj,
      $setOnInsert: {
        itemName,
      }
    };

    await ItemSummary.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      session
    });
  }
}
