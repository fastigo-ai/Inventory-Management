import mongoose from 'mongoose';
import { StoreTransfer, IStoreTransfer } from './storeTransfer.schema';
import { ApiError } from '../../core/utils/ApiError';
import { SummaryService } from '../reports/summary/summary.service';
import Item from '../items/item.model';

export class StoreTransferService {
  /**
   * Resolve Circle, Subcircle, and Package from a store name
   */
  public static resolveStoreInfo(storeName: string): { circle: string; package: string; subcircle?: string } {
    const norm = (storeName || '').toLowerCase().replace(/store|circle/gi, '').trim();

    // Package 2 (R/R): Rohru and Rampur
    if (norm.includes('rohru')) {
      return { circle: 'Rohru', package: 'Package 2 (R/R)' };
    }
    if (norm.includes('rampur')) {
      return { circle: 'Rampur', package: 'Package 2 (R/R)' };
    }

    // Package 1 (S/N): Solan (including Kumarhatti and Nalagarh) and Nahan
    if (norm.includes('nahan')) {
      return { circle: 'Nahan', package: 'Package 1 (S/N)' };
    }
    if (norm.includes('kumar') || norm.includes('hati')) {
      return { circle: 'Solan', subcircle: 'Kumarhatti', package: 'Package 1 (S/N)' };
    }
    if (norm.includes('nalagarh')) {
      return { circle: 'Solan', subcircle: 'Nalagarh', package: 'Package 1 (S/N)' };
    }
    if (norm.includes('solan')) {
      return { circle: 'Solan', package: 'Package 1 (S/N)' };
    }

    return { circle: storeName || 'Unknown', package: '' };
  }

  /**
   * Determine the jurisdiction scope of a Project Director or Admin
   */
  public static getPDScope(user: any): { package?: string; circles: string[]; storeRegex: RegExp; isSuper: boolean } {
    const roleName = user?.role?.name?.trim();
    const permissions: string[] = user?.role?.permissions || [];
    const isSuper = roleName === 'Super Admin' || roleName === 'CEO' || permissions.includes('*');

    if (isSuper) {
      return {
        package: undefined,
        circles: ['Solan', 'Kumarhatti', 'Nalagarh', 'Nahan', 'Rohru', 'Rampur'],
        storeRegex: /.*/,
        isSuper: true
      };
    }

    const pkg = (user?.assignedPackage || '').toLowerCase();
    const circle = (user?.assignedCircle || '').toLowerCase();

    // Rohru & Rampur PD (Package 2)
    if (pkg.includes('package 2') || pkg.includes('r/r') || circle.includes('rohru') || circle.includes('rampur')) {
      return {
        package: 'Package 2 (R/R)',
        circles: ['Rohru', 'Rampur'],
        storeRegex: /rohru|rampur/i,
        isSuper: false
      };
    }

    // Solan (Kumarhatti & Nalagarh) & Nahan PD (Package 1)
    if (pkg.includes('package 1') || pkg.includes('s/n') || circle.includes('solan') || circle.includes('nahan') || circle.includes('kumar') || circle.includes('nalagarh')) {
      return {
        package: 'Package 1 (S/N)',
        circles: ['Solan', 'Kumarhatti', 'Nalagarh', 'Nahan'],
        storeRegex: /solan|kumar|hati|nalagarh|nahan/i,
        isSuper: false
      };
    }

    return {
      package: user?.assignedPackage || undefined,
      circles: user?.assignedCircle ? [user.assignedCircle] : [],
      storeRegex: user?.assignedCircle ? new RegExp(user.assignedCircle, 'i') : /.*/,
      isSuper: false
    };
  }

  /**
   * Check if a user has general Project Director / Admin authority to approve store transfers
   */
  public static canApproveAsPD(user: any): boolean {
    if (!user) return false;
    const roleName = user.role?.name;
    const permissions: string[] = user.role?.permissions || [];
    return (
      roleName === 'Project Director' ||
      roleName === 'Admin' ||
      roleName === 'Super Admin' ||
      roleName === 'CEO' ||
      permissions.includes('*') ||
      permissions.includes('Project Director Portal')
    );
  }

  /**
   * Validate that the specific PD has jurisdiction over the origin store of this transfer
   */
  public static validatePDAuthorityForTransfer(user: any, transfer: IStoreTransfer): void {
    if (!this.canApproveAsPD(user)) {
      throw new ApiError(403, 'Permission denied. Only Project Directors or System Admins can approve store transfers.');
    }

    const scope = this.getPDScope(user);
    if (scope.isSuper) {
      return; // Super Admin / CEO has jurisdiction over all circles
    }

    const originInfo = this.resolveStoreInfo(transfer.fromStore);
    const originPkg = transfer.originPackage || originInfo.package;

    if (scope.package && originPkg && scope.package !== originPkg) {
      if (originPkg === 'Package 2 (R/R)') {
        throw new ApiError(
          403,
          `Permission denied: This outward transfer originated from ${transfer.fromStore} (Rohru & Rampur circle), which requires approval from the Rohru & Rampur Project Director.`
        );
      } else {
        throw new ApiError(
          403,
          `Permission denied: This outward transfer originated from ${transfer.fromStore} (Solan & Nahan circle), which requires approval from the Solan & Nahan Project Director.`
        );
      }
    }
  }

  /**
   * Create a new Store Transfer request with automatic routing metadata.
   */
  public static async createTransfer(transferData: any, user: any): Promise<IStoreTransfer> {
    const isPDOrAdmin = this.canApproveAsPD(user);
    
    // Store managers transferring stock always require PD approval
    if (!isPDOrAdmin || !transferData.status) {
      transferData.status = 'Pending PD Approval';
    }

    // Automatically resolve origin and destination circles and packages
    const origin = this.resolveStoreInfo(transferData.fromStore || user?.assignedCircle || '');
    const dest = this.resolveStoreInfo(transferData.toStore || '');

    transferData.originCircle = origin.circle;
    transferData.originSubcircle = origin.subcircle;
    transferData.originPackage = origin.package || user?.assignedPackage;

    transferData.destinationCircle = dest.circle;
    transferData.destinationSubcircle = dest.subcircle;
    transferData.destinationPackage = dest.package;

    transferData.requestedBy = user?._id;
    const transfer = await StoreTransfer.create(transferData);
    return transfer;
  }

  /**
   * Approve a store transfer by the designated Project Director
   */
  public static async approveByPD(transferId: string, user: any, remarks?: string): Promise<IStoreTransfer> {
    const transfer = await StoreTransfer.findById(transferId);
    if (!transfer) {
      throw new ApiError(404, 'Store transfer not found.');
    }

    // Verify this PD has jurisdiction over this transfer's origin circle
    this.validatePDAuthorityForTransfer(user, transfer);

    if (transfer.status === 'Approved' || transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVED') {
      throw new ApiError(400, `Transfer is already ${transfer.status.toLowerCase()}.`);
    }

    transfer.status = 'Approved';
    transfer.pdApprovedBy = user._id;
    transfer.pdApprovedAt = new Date();
    if (remarks) {
      transfer.pdApprovalRemarks = remarks;
    }

    await transfer.save();
    return transfer;
  }

  /**
   * Reject a store transfer by the designated Project Director
   */
  public static async rejectByPD(transferId: string, user: any, reason: string): Promise<IStoreTransfer> {
    const transfer = await StoreTransfer.findById(transferId);
    if (!transfer) {
      throw new ApiError(404, 'Store transfer not found.');
    }

    // Verify this PD has jurisdiction over this transfer's origin circle
    this.validatePDAuthorityForTransfer(user, transfer);

    if (transfer.status === 'RECEIVED') {
      throw new ApiError(400, 'Cannot reject a transfer that has already been received.');
    }

    transfer.status = 'REJECTED';
    transfer.rejectedBy = user._id;
    transfer.rejectedAt = new Date();
    transfer.rejectionReason = reason || 'Rejected by Project Director';

    await transfer.save();
    return transfer;
  }

  /**
   * Dispatch an approved store transfer (Store Manager dispatching to transit)
   */
  public static async dispatchTransfer(transferId: string, dispatchData: any, user: any): Promise<IStoreTransfer> {
    const transfer = await StoreTransfer.findById(transferId);
    if (!transfer) {
      throw new ApiError(404, 'Store transfer not found.');
    }

    // STRICT CHECK: Cannot dispatch unless approved by PD (or admin override)
    if (transfer.status === 'Pending PD Approval') {
      throw new ApiError(400, 'Cannot dispatch this transfer. It requires Project Director (PD) approval before stock can be moved.');
    }

    if (transfer.status === 'REJECTED') {
      throw new ApiError(400, 'Cannot dispatch a transfer that has been rejected.');
    }

    if (transfer.status === 'RECEIVED') {
      throw new ApiError(400, 'This transfer has already been received at the destination store.');
    }

    dispatchData.status = 'IN_TRANSIT';
    Object.assign(transfer, dispatchData);

    await transfer.save();
    return transfer;
  }

  /**
   * Receive a store transfer at the destination store and update stock
   */
  public static async receiveTransfer(transferId: string, updateData: any, user: any): Promise<IStoreTransfer> {
    const transfer = await StoreTransfer.findById(transferId);
    if (!transfer) {
      throw new ApiError(404, 'Store transfer not found.');
    }

    if (transfer.status === 'Pending PD Approval') {
      throw new ApiError(400, 'Cannot receive transfer. It has not been approved by the Project Director yet.');
    }

    updateData.status = 'RECEIVED';
    Object.assign(transfer, updateData);

    // Ensure all items have receivedQty populated upon receipt if not explicitly provided
    if (transfer.items && transfer.items.length > 0) {
      transfer.items.forEach(it => {
        if (!it.receivedQty || it.receivedQty === 0) {
          it.receivedQty = it.dispatchedQty || 0;
        }
      });
    }

    await transfer.save();

    // Trigger SummaryService rebuild for affected items to keep ledgers live and accurate
    const affectedItemIds = (transfer.items || [])
      .map(item => item.itemId?.toString())
      .filter(Boolean);

    for (const itemId of affectedItemIds) {
      SummaryService.rebuildForItem(itemId).catch(console.error);
    }

    return transfer;
  }
}
