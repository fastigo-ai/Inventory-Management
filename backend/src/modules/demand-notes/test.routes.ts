import express from 'express';
import DemandNote from './demandNote.schema';
import User from '../users/user.model';
import Role from '../roles/role.model';

const router = express.Router();

router.get('/test-sm', async (req, res) => {
  try {
    const user = await User.findOne({ email: 'kumarhatti@gmail.com' }).populate('role');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const roleName = (user.role as any)?.name?.trim() || '';

    const filter: any = {};
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (user.assignedPackage && user.assignedPackage.trim()) {
      let flexiblePkg = String(user.assignedPackage).replace(/\s+/g, ' ').trim();
      flexiblePkg = flexiblePkg.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
      flexiblePkg = flexiblePkg.replace(/(\\s|\s)+/g, '\\s*');
      flexiblePkg = flexiblePkg.replace(/\\([()[\]{}|\/?.*+^$])/g, '\\s*\\$1\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${flexiblePkg}\\s*$`, 'i') };
    }

    if (roleName === 'Store Manager' && user.assignedSubcircle && user.assignedSubcircle.trim()) {
      const originalCircle = user.assignedCircle || '';
      if (originalCircle.trim()) {
        filter.circle = { $regex: new RegExp(`^\\s*${escapeRegex(originalCircle.trim())}\\s*$`, 'i') };
      }
      filter.subcircle = { $regex: new RegExp(`^\\s*${escapeRegex(user.assignedSubcircle.trim())}\\s*$`, 'i') };
    }

    filter.status = { $in: ['Approved', 'Fulfilled'] };

    console.log("TEST FILTER:", filter);
    const dns = await DemandNote.find(filter).lean();
    res.json({ filter, count: dns.length, dns: dns.map((d: any) => d.demandNoteNumber) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
