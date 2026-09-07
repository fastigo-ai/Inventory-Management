import mongoose from 'mongoose';
import { ClientBill } from './src/modules/client-billing/clientBill.schema';

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const bill = await ClientBill.findOne({ raBillNo: 'RA-JMC-DEMO-1788559838269' });
  if (!bill) return;

  const supplySource = await ClientBill.findOne({ raBillNo: 'RA-164' });
  if (supplySource) {
     const thirtyPctItems = supplySource.items.map((i: any) => ({
        ...i.toObject(),
        totalAmount: Number((i.raBillQty * i.boqRate * 0.30).toFixed(2)),
        gstAmount: 0
     }));
     const supplyDraft = new ClientBill({
        raBillNo: `${supplySource.raBillNo}-S30-AUTO`,
        raBillDate: new Date(),
        billType: 'Supply',
        stage: '30%',
        referenceType: supplySource.referenceType,
        referenceIds: supplySource.referenceIds,
        items: thirtyPctItems,
        circle: bill.circle,
        package: bill.package,
        createdBy: bill.createdBy,
        status: 'Draft',
        autoCreated: true,
        parentBillId: bill._id
      });
      await supplyDraft.save();
      console.log("Created 30% bill:", supplyDraft.raBillNo);
  }
  process.exit();
});
