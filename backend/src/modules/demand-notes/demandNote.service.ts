import mongoose from 'mongoose';
import DemandNote, { IDemandNote } from './demandNote.schema';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { applyDemandQtyToWorkOrder } from './demandNote.helper';
import { ApiError } from '../../core/utils/ApiError';

export class DemandNoteService {
  /**
   * Checks whether material has already been issued from the store against a Demand Note.
   */
  static async checkMaterialIssued(
    demandNoteNumber: string,
    status?: string
  ): Promise<{ isIssued: boolean; reason?: string }> {
    if (status === 'Fulfilled') {
      return {
        isIssued: true,
        reason: 'Demand Note is already marked as Fulfilled by the store.'
      };
    }

    const escaped = demandNoteNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingAssignment = await ContractorAssignment.findOne({
      $or: [
        { demandNo: new RegExp(`(^|,\\s*)${escaped}(\\s*,|$)`, 'i') },
        { linkedDemandNotes: demandNoteNumber }
      ],
      status: { $ne: 'Cancelled' }
    }).lean();

    if (existingAssignment) {
      const assignmentDoc = existingAssignment as any;
      const docIdentifier = assignmentDoc.assignmentNumber || assignmentDoc.minNo || 'Store Issue Note';
      return {
        isIssued: true,
        reason: `Material has already been issued under ${docIdentifier}.`
      };
    }

    return { isIssued: false };
  }

  /**
   * Revoke an approved Demand Note and send back for revision.
   * Only permitted for Project Director (PD) or Admin roles, and only if no store issue has occurred.
   */
  static async revokeDemandNote(
    id: string,
    user: any,
    correctionRemarks: string
  ): Promise<IDemandNote> {
    if (!correctionRemarks || !correctionRemarks.trim()) {
      throw new ApiError(400, 'Correction remarks are mandatory when revoking a Demand Note for revision.');
    }

    const demandNote = await DemandNote.findById(id);
    if (!demandNote) {
      throw new ApiError(404, 'Demand Note not found.');
    }

    if (demandNote.status === 'Cancelled') {
      throw new ApiError(400, 'Cannot revoke a cancelled Demand Note.');
    }

    if (demandNote.status === 'Rejected') {
      throw new ApiError(400, 'Cannot revoke a rejected Demand Note.');
    }

    if (demandNote.status === 'Draft' || demandNote.status === 'Revision Required') {
      throw new ApiError(400, `Demand Note is already in ${demandNote.status} status.`);
    }

    const issueCheck = await this.checkMaterialIssued(demandNote.demandNoteNumber, demandNote.status);
    if (issueCheck.isIssued) {
      throw new ApiError(400, `Cannot revoke Demand Note: ${issueCheck.reason}`);
    }

    demandNote.status = 'Revision Required';
    demandNote.revokedBy = user._id;
    demandNote.revokedAt = new Date();
    demandNote.revocationRemarks = correctionRemarks.trim();

    // Reset approvals so the workflow starts fresh when re-submitted
    demandNote.pmApprovedBy = undefined;
    demandNote.pmApprovedAt = undefined;
    demandNote.pmApprovalRemarks = undefined;
    demandNote.pdApprovedBy = undefined;
    demandNote.pdApprovedAt = undefined;

    await demandNote.save();
    return demandNote;
  }

  /**
   * Cancel / Void a Demand Note.
   * Reverts any work order demand allocations, releases held stock, and records cancellation audit.
   */
  static async cancelDemandNote(
    id: string,
    user: any,
    cancellationRemarks: string
  ): Promise<IDemandNote> {
    if (!cancellationRemarks || !cancellationRemarks.trim()) {
      throw new ApiError(400, 'Cancellation remarks are mandatory when voiding/cancelling a Demand Note.');
    }

    const demandNote = await DemandNote.findById(id);
    if (!demandNote) {
      throw new ApiError(404, 'Demand Note not found.');
    }

    if (demandNote.status === 'Cancelled') {
      throw new ApiError(400, 'Demand Note is already cancelled.');
    }

    const issueCheck = await this.checkMaterialIssued(demandNote.demandNoteNumber, demandNote.status);
    if (issueCheck.isIssued) {
      throw new ApiError(400, `Cannot cancel Demand Note: ${issueCheck.reason}`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Revert work order commitments if previously applied and not already rejected
      if (demandNote.workOrderId && demandNote.drawingNumber && demandNote.status !== 'Rejected') {
        await applyDemandQtyToWorkOrder(demandNote.workOrderId, demandNote.drawingNumber, demandNote.items, session, true);
      }

      demandNote.status = 'Cancelled';
      demandNote.cancelledBy = user._id;
      demandNote.cancelledAt = new Date();
      demandNote.cancellationRemarks = cancellationRemarks.trim();

      await demandNote.save({ session });
      await session.commitTransaction();
      session.endSession();

      return demandNote;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(error.statusCode || 500, error.message || 'Failed to cancel Demand Note');
    }
  }

  /**
   * Query issuance status for front-end verification before actions.
   */
  static async getIssuanceStatus(id: string): Promise<{ isIssued: boolean; reason?: string; status: string }> {
    const demandNote = await DemandNote.findById(id).select('demandNoteNumber status').lean();
    if (!demandNote) {
      throw new ApiError(404, 'Demand Note not found.');
    }
    const issueCheck = await this.checkMaterialIssued(demandNote.demandNoteNumber, demandNote.status);
    return { ...issueCheck, status: demandNote.status };
  }
}

