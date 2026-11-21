import { Mhrov } from './mhrov.schema';
import { ApiError } from '../../core/utils/ApiError';
import { syncMhrovQuantities } from './mhrov.controller';

export class MhrovService {
  /**
   * Update the status of an existing MHROV ('Pending', 'Pending Signature', 'Done')
   */
  async updateStatus(id: string, newStatus: string) {
    if (!newStatus) {
      throw new ApiError(400, 'Status is required');
    }

    const validStatuses = ['Pending', 'Pending Signature', 'Done'];
    const matchedStatus = validStatuses.find(
      (s) => s.toLowerCase() === newStatus.trim().toLowerCase()
    );

    if (!matchedStatus) {
      throw new ApiError(
        400,
        `Invalid status '${newStatus}'. Must be one of: ${validStatuses.join(', ')}`
      );
    }

    const mhrov = await Mhrov.findById(id);
    if (!mhrov) {
      throw new ApiError(404, 'MHROV not found');
    }

    // Once an MHROV is Done, it cannot transition back to Pending or Pending Signature
    if (mhrov.status?.toUpperCase() === 'DONE' && matchedStatus !== 'Done') {
      throw new ApiError(
        400,
        'Cannot change status of an MHROV that is already Done. Once marked as Done, it cannot return to Pending.'
      );
    }

    mhrov.status = matchedStatus;
    await mhrov.save();

    // Trigger sync in background for associated inward entries and DI items
    (async () => {
      try {
        if (mhrov.inwardEntries && mhrov.inwardEntries.length > 0) {
          for (const entryId of mhrov.inwardEntries) {
            if (entryId) {
              await syncMhrovQuantities(undefined, undefined, entryId.toString());
            }
          }
        }
        if (mhrov.items && mhrov.items.length > 0) {
          for (const it of mhrov.items) {
            if (it.inwardEntryId) {
              await syncMhrovQuantities(undefined, undefined, it.inwardEntryId.toString());
            }
            if (it.diId && it.itemId) {
              await syncMhrovQuantities(it.diId.toString(), it.itemId.toString());
            }
          }
        }
      } catch (err) {
        console.error('Background sync error on MHROV status change:', err);
      }
    })();

    return mhrov;
  }
}

export const mhrovService = new MhrovService();
