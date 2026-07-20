import mongoose, { Schema } from 'mongoose';
const purchaseInvoiceLineItemSchema = new Schema({
    itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
    itemName: { type: String, required: true },
    description: { type: String },
    hsnCode: { type: String },
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true, default: 0 },
});
const purchaseInvoiceSchema = new Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    vendorName: { type: String, required: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    purchaseOrderNumber: { type: String },
    date: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    billingCompany: {
        name: { type: String },
        address: { type: String },
        phone: { type: String },
        email: { type: String },
        logoUrl: { type: String },
    },
    lineItems: [purchaseInvoiceLineItemSchema],
    notes: { type: String },
    termsConditions: { type: String },
    subTotal: { type: Number, required: true, default: 0 },
    cgstPercentage: { type: Number, default: 0 },
    sgstPercentage: { type: Number, default: 0 },
    igstPercentage: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Unpaid', 'Overdue', 'Partially Paid', 'Paid'],
        default: 'Draft'
    },
    attachments: [{
            name: { type: String },
            url: { type: String }
        }],
}, {
    timestamps: true,
});
// Pre-save hook to calculate balance due and update status if needed
purchaseInvoiceSchema.pre('save', function (next) {
    if (this.isModified('total') || this.isModified('amountPaid')) {
        this.balanceDue = this.total - (this.amountPaid || 0);
        // Automatically manage Paid / Partially Paid statuses
        if (this.status !== 'Draft' && this.status !== 'Sent') {
            if (this.amountPaid > 0 && this.amountPaid < this.total) {
                this.status = 'Partially Paid';
            }
            else if (this.amountPaid >= this.total && this.total > 0) {
                this.status = 'Paid';
            }
            else if (this.amountPaid === 0 && (this.status === 'Partially Paid' || this.status === 'Paid')) {
                this.status = 'Unpaid';
            }
        }
    }
    next();
});
import { auditPlugin } from '../../core/plugins/audit.plugin';
purchaseInvoiceSchema.plugin(auditPlugin, { entityName: 'PurchaseInvoice', track: true });
export const PurchaseInvoice = mongoose.models.PurchaseInvoice || mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);
