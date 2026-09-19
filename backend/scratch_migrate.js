const mongoose = require('mongoose');
require('dotenv').config();

const StoreInwardEntrySchema = new mongoose.Schema({ status: String }, { strict: false, collection: 'storeinwardentries' });
const StoreInwardEntry = mongoose.model('StoreInwardEntry', StoreInwardEntrySchema);

const MhrovSchema = new mongoose.Schema({ status: String }, { strict: false, collection: 'mhrovs' });
const Mhrov = mongoose.model('Mhrov', MhrovSchema);

const replacements = {
    'DRAFT': 'Draft',
    'PENDING_RECEIPT': 'Pending Receipt',
    'APPROVED': 'Approved',
    'SUBMITTED': 'Submitted',
    'VERIFIED': 'Verified',
    'NEEDS_CORRECTION': 'Needs Correction',
    'VOIDED': 'Voided',
    'done': 'Done',
    'pending': 'Pending',
    'MHROV done but not signed': 'Pending Signature'
};

async function migrate() {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    let inwardUpdated = 0;
    for (const [oldStatus, newStatus] of Object.entries(replacements)) {
        const result = await StoreInwardEntry.updateMany({ status: oldStatus }, { $set: { status: newStatus } });
        if (result.modifiedCount > 0) {
            console.log(`StoreInwardEntry: Updated ${result.modifiedCount} records from '${oldStatus}' to '${newStatus}'`);
            inwardUpdated += result.modifiedCount;
        }
    }
    console.log(`Total StoreInwardEntry records updated: ${inwardUpdated}`);

    let mhrovUpdated = 0;
    for (const [oldStatus, newStatus] of Object.entries(replacements)) {
        const result = await Mhrov.updateMany({ status: oldStatus }, { $set: { status: newStatus } });
        if (result.modifiedCount > 0) {
            console.log(`Mhrov: Updated ${result.modifiedCount} records from '${oldStatus}' to '${newStatus}'`);
            mhrovUpdated += result.modifiedCount;
        }
    }
    console.log(`Total Mhrov records updated: ${mhrovUpdated}`);

    await mongoose.disconnect();
    console.log('Done.');
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
