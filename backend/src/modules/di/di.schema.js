import mongoose, { Schema } from 'mongoose';
const diLineItemSchema = new Schema({
    itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
    itemName: { type: String, required: true },
    tempCode: { type: String },
    package: { type: String },
    circle: { type: String },
    quantity: { type: Number, required: true, default: 0 },
});
const diSchema = new Schema({
    diNumber: { type: String, required: true, unique: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    date: { type: Date, required: true, default: Date.now },
    circle: { type: String },
    package: { type: String },
    lineItems: [diLineItemSchema],
    status: { type: String, enum: ['Draft', 'Pending Receipt', 'Received', 'Cancelled'], default: 'Pending Receipt' },
    notes: { type: String },
    attachments: [{
            name: { type: String },
            url: { type: String }
        }],
}, { timestamps: true });
export const DI = mongoose.models.DI || mongoose.model('DI', diSchema);
