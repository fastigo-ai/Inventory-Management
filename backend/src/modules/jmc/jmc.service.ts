import mongoose from 'mongoose';
import { JmcRegister } from './jmc.schema';
import { ApiError } from '../../core/utils/ApiError';

export class JmcService {
  /**
   * Send JMC for PM and PD approval
   */
  static async sendForApproval(id: string, user: any) {
    const jmc = await JmcRegister.findById(id);
    if (!jmc) {
      throw new ApiError(404, 'JMC Register entry not found');
    }

    if (jmc.approvalStatus === 'Approved') {
      throw new ApiError(400, 'JMC is already approved and cannot be re-sent for approval');
    }

    jmc.approvalStatus = 'Pending PM Approval';
    jmc.status = 'Submitted';
    jmc.pmStatus = 'Pending';
    jmc.pdStatus = 'Pending';
    jmc.pmApprovedBy = undefined;
    jmc.pmApprovedAt = undefined;
    jmc.pmApprovalRemarks = '';
    jmc.pdApprovedBy = undefined;
    jmc.pdApprovedAt = undefined;
    jmc.pdApprovalRemarks = '';
    jmc.rejectedBy = undefined;
    jmc.rejectedAt = undefined;
    jmc.rejectionRemarks = '';
    jmc.approvalRemarks = '';

    await jmc.save();
    return jmc;
  }

  /**
   * Approve JMC by PM, PD, or Admin
   */
  static async approveJmc(id: string, user: any, remarks?: string) {
    const jmc = await JmcRegister.findById(id);
    if (!jmc) {
      throw new ApiError(404, 'JMC Register entry not found');
    }

    if (jmc.approvalStatus === 'Approved') {
      throw new ApiError(400, 'JMC is already approved');
    }

    const roleName = user?.role?.name || '';
    const isSuperOrAdmin =
      roleName === 'Admin' ||
      roleName === 'Super Admin' ||
      roleName === 'CEO' ||
      user?.role?.permissions?.includes('*');

    const isPM = roleName === 'Project Manager' || roleName === 'PM' || isSuperOrAdmin;
    const isPD = roleName === 'Project Director' || roleName === 'PD' || isSuperOrAdmin;

    if (!isPM && !isPD) {
      throw new ApiError(403, 'You do not have permission to approve JMCs');
    }

    // Direct super admin approval
    if (isSuperOrAdmin) {
      jmc.pmApprovedBy = user._id;
      jmc.pmApprovedAt = new Date();
      jmc.pmApprovalRemarks = remarks || jmc.pmApprovalRemarks || 'Approved by Admin';
      jmc.pmStatus = 'Approved';

      jmc.pdApprovedBy = user._id;
      jmc.pdApprovedAt = new Date();
      jmc.pdApprovalRemarks = remarks || jmc.pdApprovalRemarks || 'Approved by Admin';
      jmc.pdStatus = 'Approved';

      jmc.approvalStatus = 'Approved';
      jmc.status = 'Approved';
      jmc.approvalRemarks = remarks || 'Approved by Admin';
      await jmc.save();
      return jmc;
    }

    // PM Approval
    if (isPM && (jmc.approvalStatus === 'Pending PM Approval' || jmc.approvalStatus === 'Draft' || jmc.status === 'Submitted')) {
      jmc.pmApprovedBy = user._id;
      jmc.pmApprovedAt = new Date();
      jmc.pmApprovalRemarks = remarks || '';
      jmc.pmStatus = 'Approved';

      if (jmc.pdStatus === 'Approved') {
        jmc.approvalStatus = 'Approved';
        jmc.status = 'Approved';
      } else {
        jmc.approvalStatus = 'Pending PD Approval';
      }
      jmc.approvalRemarks = remarks || jmc.approvalRemarks || '';
      await jmc.save();
      return jmc;
    }

    // PD Approval
    if (isPD && (jmc.approvalStatus === 'Pending PD Approval' || jmc.approvalStatus === 'Pending PM Approval' || jmc.status === 'Submitted')) {
      jmc.pdApprovedBy = user._id;
      jmc.pdApprovedAt = new Date();
      jmc.pdApprovalRemarks = remarks || '';
      jmc.pdStatus = 'Approved';

      if (jmc.pmStatus === 'Approved') {
        jmc.approvalStatus = 'Approved';
        jmc.status = 'Approved';
      } else {
        jmc.approvalStatus = 'Pending PM Approval';
      }
      jmc.approvalRemarks = remarks || jmc.approvalRemarks || '';
      await jmc.save();
      return jmc;
    }

    await jmc.save();
    return jmc;
  }

  /**
   * Reject JMC with remarks
   */
  static async rejectJmc(id: string, user: any, remarks: string) {
    if (!remarks || !remarks.trim()) {
      throw new ApiError(400, 'Rejection remarks are mandatory');
    }

    const jmc = await JmcRegister.findById(id);
    if (!jmc) {
      throw new ApiError(404, 'JMC Register entry not found');
    }

    const roleName = user?.role?.name || '';
    const isSuperOrAdmin =
      roleName === 'Admin' ||
      roleName === 'Super Admin' ||
      roleName === 'CEO' ||
      user?.role?.permissions?.includes('*');

    const isPM = roleName === 'Project Manager' || roleName === 'PM' || isSuperOrAdmin;
    const isPD = roleName === 'Project Director' || roleName === 'PD' || isSuperOrAdmin;

    if (!isPM && !isPD) {
      throw new ApiError(403, 'You do not have permission to reject JMCs');
    }

    // DO NOT mark jmc.status as 'Rejected' - JMC remains Submitted
    jmc.status = 'Submitted';
    jmc.approvalStatus = 'Rejected';
    jmc.rejectedBy = user._id;
    jmc.rejectedAt = new Date();
    jmc.rejectionRemarks = remarks.trim();
    jmc.approvalRemarks = remarks.trim();

    if (isPM) {
      jmc.pmStatus = 'Rejected';
      jmc.pmApprovalRemarks = remarks.trim();
    }
    if (isPD) {
      jmc.pdStatus = 'Rejected';
      jmc.pdApprovalRemarks = remarks.trim();
    }

    await jmc.save();
    return jmc;
  }
}
