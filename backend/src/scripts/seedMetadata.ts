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

      // Item Details
     { name: 'unit', label: 'Unit', type: 'text', required: true, visible: true, editable: true, tab: 'Item Details', order: 7, colSpan: 1, systemLocked: true },
      { name: 'sku', label: 'SKU', type: 'text', required: true, visible: true, editable: true, unique: true, tab: 'Item Details', order: 8, colSpan: 1, systemLocked: true },

      // Item Description
      { name: 'description', label: 'Description', type: 'text', widget: 'textarea', required: false, visible: true, editable: true, tab: 'Item Description', order: 9, colSpan: 2 },

    
     
      
      
      // Additional Information
      { name: 'tempCode', label: 'TEMP CODE', type: 'text', required: false, visible: true, editable: true, tab: 'Additional Information', order: 27, colSpan: 1 },
      { name: 'activity', label: 'Activity', type: 'dropdown', options: [], required: false, visible: true, editable: true, tab: 'Additional Information', order: 28, colSpan: 1 },
      { name: 'loaQuantity', label: 'LOA Quantity', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 29, colSpan: 1 },
      { name: 'package', label: 'Package', type: 'dropdown', options: ['Package 1(S/N)', 'Package 2(R/R)'], required: false, visible: true, editable: true, tab: 'Additional Information', order: 30, colSpan: 1 },
      { name: 'circle', label: 'Circle', type: 'dropdown', options: ['Solan', 'Nahan', 'Rampur', 'Rohru'], required: false, visible: true, editable: true, tab: 'Additional Information', order: 31, colSpan: 1 },
      { name: 'solanLoaQuantity', label: 'Solan LOA Qty', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 32, colSpan: 1 },
      { name: 'nahanLoaQuantity', label: 'Nahan LOA Qty', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 33, colSpan: 1 },
      { name: 'rampurLoaQuantity', label: 'Rampur LOA Qty', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 34, colSpan: 1 },
      { name: 'rohruLoaQuantity', label: 'Rohru LOA Qty', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 35, colSpan: 1 },
      { name: 'solanBomQuantity', label: 'Solan BOM Qty', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 36, colSpan: 1 },
      { name: 'nahanBomQuantity', label: 'Nahan BOM Qty', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 37, colSpan: 1 },
      { name: 'rampurBomQuantity', label: 'Rampur BOM Qty', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 38, colSpan: 1 },
      { name: 'rohruBomQuantity', label: 'Rohru BOM Qty', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 39, colSpan: 1 },
      { name: 'erectionRateWithGst', label: 'Erection Rate with GST', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 40, colSpan: 1 },
      { name: 'supplyRateWithGst', label: 'Supply Rate With GST', type: 'number', required: false, visible: true, editable: true, tab: 'Additional Information', order: 41, colSpan: 1 }
    ];

    await Metadata.findOneAndUpdate(
      { entityName: 'Item' },
      { fields: itemFields },
      { upsert: true, returnDocument: 'after' }
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
      { upsert: true, returnDocument: 'after' }
    );
    console.log('Vendor Metadata seeded successfully');

    // Clone vendorFields for Contractor, perhaps tweaking minor labels if desired, but user wants EXACT same.
    const contractorFields = vendorFields
      .filter(f => !['customFields', 'reportingTags', 'remarks'].includes(f.name))
      .map(field => {
      // Just copy exact schema but maybe change Vendor to Contractor in some labels where it makes sense, though the user said "nothing less thik as an senior experience backend developer the registration method is different but the things for the input field is same". I'll keep it identical for safety except maybe label changes.
      const newField = { ...field };
      if (newField.label === 'Vendor Language') newField.label = 'Contractor Language';
      if (newField.checkboxLabel === 'This vendor is MSME registered') newField.checkboxLabel = 'This contractor is MSME registered';
      if (newField.checkboxLabel === 'Allow portal access for this vendor') newField.checkboxLabel = 'Allow portal access for this contractor';
      
      // Update address widget for contractor (single address)
      if (newField.name === 'vendorAddresses') {
        newField.name = 'contractorAddress';
        newField.widget = 'single_address';
      }

      return newField;
    });

    await Metadata.findOneAndUpdate(
      { entityName: 'Contractor' },
      { fields: contractorFields },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('Contractor Metadata seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedMetadata();
