import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Metadata from '../modules/metadata/metadata.model';

dotenv.config();

const seedMetadata = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_system';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const itemFields = [
      // Top Level (No Tab Name rendered usually, but we'll call it "Basic")
      { name: 'name', label: 'Name', type: 'text', required: true, visible: true, editable: true, tab: 'Basic', order: 1, colSpan: 1, systemLocked: true },
      { name: 'images', label: 'Images', type: 'text', widget: 'image_upload', required: false, visible: false, editable: true, tab: 'Basic', order: 2, colSpan: 1 },
      { name: 'type', label: 'Type', type: 'dropdown', widget: 'radio', required: true, visible: true, editable: true, options: ['Goods', 'Service'], defaultValue: 'Goods', tab: 'Basic', order: 3, colSpan: 1, systemLocked: true },
      { name: 'brand', label: 'Brand', type: 'dropdown', required: false, visible: true, editable: true, options: ['Select or Add Brand'], tab: 'Basic', order: 4, colSpan: 1, systemLocked: true },
      { name: 'manufacturer', label: 'Manufacturer', type: 'dropdown', required: false, visible: false, editable: true, options: ['Select or Add Manufacturer'], tab: 'Basic', order: 5, colSpan: 1, systemLocked: true },

      // Item Details
      { name: 'itemType', label: 'Item Type', type: 'dropdown', widget: 'radio', required: false, visible: false, editable: true, options: ['Single Item', 'Contains Variants'], defaultValue: 'Single Item', tab: 'Item Details', order: 6 },
      { name: 'unit', label: 'Unit', type: 'dropdown', required: true, visible: true, editable: true, options: ['pcs', 'kg', 'box', 'm'], tab: 'Item Details', order: 7, colSpan: 1, systemLocked: true },
      { name: 'sku', label: 'SKU', type: 'text', required: true, visible: true, editable: true, unique: true, tab: 'Item Details', order: 8, colSpan: 1, systemLocked: true },

      // Item Description
      { name: 'description', label: 'Description', type: 'text', widget: 'textarea', required: false, visible: true, editable: true, tab: 'Item Description', order: 9, colSpan: 2 },

      // Sales Information (Toggleable)
      { name: 'enableSales', label: 'Sales Information', type: 'boolean', sectionToggle: true, defaultValue: true, required: false, visible: false, editable: true, tab: 'Sales Information', order: 10 },
      { name: 'sellingPrice', label: 'Selling Price', type: 'number', required: true, visible: true, editable: true, defaultValue: 0, tab: 'Sales Information', order: 11, colSpan: 1, systemLocked: true },
      { name: 'salesAccount', label: 'Account', type: 'dropdown', required: true, visible: false, editable: true, options: ['Sales', 'Discount', 'General Income'], defaultValue: 'Sales', tab: 'Sales Information', order: 12, colSpan: 1 },
      { name: 'salesDescription', label: 'Description', type: 'text', widget: 'textarea', required: false, visible: false, editable: true, tab: 'Sales Information', order: 13, colSpan: 2 },

      // Purchase Information (Toggleable)
      { name: 'enablePurchase', label: 'Purchase Information', type: 'boolean', sectionToggle: true, defaultValue: true, required: false, visible: false, editable: true, tab: 'Purchase Information', order: 14 },
      { name: 'costPrice', label: 'Cost Price', type: 'number', required: true, visible: true, editable: true, defaultValue: 0, tab: 'Purchase Information', order: 15, colSpan: 1, systemLocked: true },
      { name: 'purchaseAccount', label: 'Account', type: 'dropdown', required: true, visible: false, editable: true, options: ['Cost of Goods Sold', 'Inventory Asset'], defaultValue: 'Cost of Goods Sold', tab: 'Purchase Information', order: 16, colSpan: 1 },
      { name: 'purchaseDescription', label: 'Description', type: 'text', widget: 'textarea', required: false, visible: false, editable: true, tab: 'Purchase Information', order: 17, colSpan: 1 },
      { name: 'preferredVendor', label: 'Preferred Vendor', type: 'dropdown', required: false, visible: false, editable: true, options: [], tab: 'Purchase Information', order: 18, colSpan: 1 },

      // Track Inventory
      { name: 'trackInventory', label: 'Track Inventory for this item', type: 'boolean', sectionToggle: true, defaultValue: true, required: false, visible: true, editable: true, tab: 'Track Inventory', order: 19 },
      { name: 'binLocation', label: 'Bin Location Tracking', type: 'dropdown', widget: 'radio', options: ['Yes', 'No'], defaultValue: 'No', required: false, visible: false, editable: true, tab: 'Track Inventory', order: 20, colSpan: 2 },
      { name: 'inventoryAccount', label: 'Inventory Account', type: 'dropdown', options: ['Inventory Asset'], defaultValue: 'Inventory Asset', required: true, visible: false, editable: true, tab: 'Track Inventory', order: 21, colSpan: 1 },
      { name: 'inventoryValuation', label: 'Inventory Valuation Method', type: 'dropdown', options: ['FIFO (First In, First Out)'], defaultValue: 'FIFO (First In, First Out)', required: true, visible: false, editable: true, tab: 'Track Inventory', order: 22, colSpan: 1 },
      { name: 'reorderPoint', label: 'Reorder Point', type: 'number', required: false, visible: false, editable: true, tab: 'Track Inventory', order: 23, colSpan: 1 },

      // Cancellation and Returns
      { name: 'returnableItem', label: 'Returnable Item', type: 'dropdown', widget: 'radio', options: ['Yes', 'No'], defaultValue: 'Yes', required: false, visible: false, editable: true, tab: 'Cancellation and Returns', order: 24, colSpan: 2 },

      // Fulfilment Details
      { name: 'dimensions', label: 'Dimensions', type: 'text', widget: 'dimensions', required: false, visible: false, editable: true, tab: 'Fulfilment Details', order: 25, colSpan: 1 },
      { name: 'weight', label: 'Weight', type: 'text', widget: 'weight', required: false, visible: false, editable: true, tab: 'Fulfilment Details', order: 26, colSpan: 1 },

      // Additional Information
      { name: 'tempCode', label: 'TEMP CODE', type: 'text', required: false, visible: true, editable: true, tab: 'Additional Information', order: 27, colSpan: 1 },
      { name: 'loaQuantity', label: 'LOA Quantity', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 28, colSpan: 1 },
      { name: 'circle', label: 'Circle', type: 'dropdown', options: ['Delhi', 'Mumbai', 'Bangalore'], required: false, visible: true, editable: true, tab: 'Additional Information', order: 29, colSpan: 1 }
    ];

    await Metadata.findOneAndUpdate(
      { entityName: 'Item' },
      { fields: itemFields },
      { upsert: true, new: true }
    );
    console.log('Item Metadata seeded successfully');

    const vendorFields = [
      // Basic Info
      { name: 'primaryContact', label: 'Primary Contact', type: 'compound', widget: 'vendor_primary_contact', required: false, visible: true, editable: true, tab: 'Basic Info', order: 1, colSpan: 1, systemLocked: true, hasInfo: true },
      { name: 'companyName', label: 'Company Name', type: 'text', required: false, visible: true, editable: true, tab: 'Basic Info', order: 2, colSpan: 1, systemLocked: true },
      { name: 'displayName', label: 'Display Name', type: 'text', required: true, visible: true, editable: true, unique: true, tab: 'Basic Info', order: 3, colSpan: 1, systemLocked: true, hasInfo: true, labelColor: 'red' },
      { name: 'emailAddress', label: 'Email Address', type: 'email', widget: 'email_input', required: false, visible: true, editable: true, tab: 'Basic Info', order: 4, colSpan: 1, systemLocked: true, hasInfo: true },
      { name: 'phone', label: 'Phone', type: 'compound', widget: 'vendor_phone', required: false, visible: true, editable: true, tab: 'Basic Info', order: 5, colSpan: 1, systemLocked: true, hasInfo: true },
      { name: 'vendorLanguage', label: 'Vendor Language', type: 'dropdown', options: ['English', 'Spanish', 'French'], defaultValue: 'English', required: false, visible: false, editable: true, tab: 'Basic Info', order: 6, colSpan: 1, systemLocked: true, hasInfo: true },

      // Other Details Tab
      { name: 'gstTreatment', label: 'GST Treatment', type: 'dropdown', options: ['Registered Business - Regular', 'Registered Business - Composition', 'Unregistered Business', 'Consumer', 'Overseas', 'Special Economic Zone', 'Deemed Export'], required: false, visible: false, editable: true, tab: 'Other Details', order: 8, colSpan: 1, hasInfo: true },
      { name: 'gstin', label: 'GSTIN (UIN)', type: 'text', required: false, visible: false, editable: true, tab: 'Other Details', order: 9, colSpan: 1, hasInfo: true },
      { name: 'pan', label: 'PAN', type: 'text', required: false, visible: false, editable: true, tab: 'Other Details', order: 10, colSpan: 1, hasInfo: true },
      { name: 'msmeRegistered', label: 'MSME Registered?', type: 'boolean', defaultValue: false, required: false, visible: false, editable: true, tab: 'Other Details', order: 11, colSpan: 1, hasInfo: true, checkboxLabel: 'This vendor is MSME registered' },
      { name: 'currency', label: 'Currency', type: 'dropdown', options: ['INR- Indian Rupee', 'USD- US Dollar', 'EUR- Euro'], defaultValue: 'INR- Indian Rupee', required: false, visible: false, editable: true, tab: 'Other Details', order: 12, colSpan: 1 },
      { name: 'paymentTerms', label: 'Payment Terms', type: 'compound', widget: 'payment_terms_complex', required: false, visible: false, editable: true, tab: 'Other Details', order: 13, colSpan: 2 },
      { name: 'tds', label: 'TDS/TCS (%)', type: 'text', defaultValue: '', required: false, visible: false, editable: true, tab: 'Other Details', order: 14, colSpan: 1 },
      { name: 'enablePortal', label: 'Enable Portal?', type: 'boolean', defaultValue: false, required: false, visible: false, editable: true, tab: 'Other Details', order: 15, colSpan: 1, checkboxLabel: 'Allow portal access for this vendor' },
      { name: 'documents', label: 'Documents', type: 'text', widget: 'file_upload', required: false, visible: false, editable: true, tab: 'Other Details', order: 16, colSpan: 1 },
      { name: 'websiteUrl', label: 'Website URL', type: 'text', required: false, visible: false, editable: true, tab: 'Other Details', order: 16.1, colSpan: 1, placeholder: 'ex: www.zylker.com', icon: 'globe' },
      { name: 'department', label: 'Department', type: 'text', required: false, visible: false, editable: true, tab: 'Other Details', order: 16.2, colSpan: 1 },
      { name: 'designation', label: 'Designation', type: 'text', required: false, visible: false, editable: true, tab: 'Other Details', order: 16.3, colSpan: 1 },
      { name: 'twitter', label: 'X', type: 'text', required: false, visible: false, editable: true, tab: 'Other Details', order: 16.4, colSpan: 1, placeholder: 'https://x.com/', icon: 'twitter' },
      { name: 'skype', label: 'Skype Name/Number', type: 'text', required: false, visible: false, editable: true, tab: 'Other Details', order: 16.5, colSpan: 1, icon: 'skype' },
      { name: 'facebook', label: 'Facebook', type: 'text', required: false, visible: false, editable: true, tab: 'Other Details', order: 16.6, colSpan: 1, placeholder: 'http://www.facebook.com/', icon: 'facebook' },

      // Address Tab
      { name: 'vendorAddresses', label: 'Addresses', type: 'compound', widget: 'vendor_address', required: false, visible: false, editable: true, tab: 'Address', order: 17, colSpan: 2 },
      { name: 'contactPersons', label: '', type: 'compound', widget: 'vendor_contact_persons', required: false, visible: false, editable: true, tab: 'Contact Persons', order: 19, colSpan: 2 },
      { name: 'bankDetails', label: '', type: 'compound', widget: 'vendor_bank_details', required: false, visible: false, editable: true, tab: 'Bank Details', order: 20, colSpan: 2 },
      { name: 'customFields', label: 'Custom Fields', type: 'text', widget: 'textarea', required: false, visible: false, editable: true, tab: 'Custom Fields', order: 21, colSpan: 1 },
      { name: 'reportingTags', label: 'Reporting Tags', type: 'text', widget: 'textarea', required: false, visible: false, editable: true, tab: 'Reporting Tags', order: 22, colSpan: 1 },
      { name: 'remarks', label: 'Remarks', type: 'text', widget: 'textarea', required: false, visible: false, editable: true, tab: 'Remarks', order: 23, colSpan: 1 }
    ];

    await Metadata.findOneAndUpdate(
      { entityName: 'Vendor' },
      { fields: vendorFields },
      { upsert: true, new: true }
    );
    console.log('Vendor Metadata seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedMetadata();
