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
      { name: 'type', label: 'Type', type: 'dropdown', required: true, visible: true, editable: true, options: ['Goods', 'Service'], defaultValue: 'Goods', tab: 'General', order: 1 },
      { name: 'name', label: 'Item Name', type: 'text', required: true, visible: true, editable: true, tab: 'General', order: 2 },
      { name: 'sku', label: 'SKU', type: 'text', required: false, visible: true, editable: true, tab: 'General', order: 3 },
      { name: 'unit', label: 'Unit', type: 'dropdown', required: true, visible: true, editable: true, options: ['pcs', 'kg', 'box', 'm'], defaultValue: 'pcs', tab: 'General', order: 4 },
      { name: 'hsn', label: 'HSN Code', type: 'text', required: false, visible: true, editable: true, tab: 'General', order: 5 },
      
      { name: 'sellingPrice', label: 'Selling Price', type: 'number', required: true, visible: true, editable: true, defaultValue: 0, tab: 'Sales', order: 6 },
      { name: 'salesAccount', label: 'Sales Account', type: 'text', required: true, visible: true, editable: true, defaultValue: 'Sales', tab: 'Sales', order: 7 },
      { name: 'salesDescription', label: 'Description', type: 'text', required: false, visible: true, editable: true, tab: 'Sales', order: 8 },

      { name: 'purchasePrice', label: 'Cost Price', type: 'number', required: true, visible: true, editable: true, defaultValue: 0, tab: 'Purchase', order: 9 },
      { name: 'purchaseAccount', label: 'Purchase Account', type: 'text', required: true, visible: true, editable: true, defaultValue: 'Cost of Goods Sold', tab: 'Purchase', order: 10 },
      { name: 'purchaseDescription', label: 'Description', type: 'text', required: false, visible: true, editable: true, tab: 'Purchase', order: 11 },

      { name: 'trackInventory', label: 'Track Inventory', type: 'boolean', required: false, visible: true, editable: true, defaultValue: false, tab: 'Inventory', order: 12 },
      { name: 'openingStock', label: 'Opening Stock', type: 'number', required: false, visible: true, editable: true, defaultValue: 0, tab: 'Inventory', order: 13 },
      { name: 'inventoryAccount', label: 'Inventory Account', type: 'text', required: false, visible: true, editable: true, defaultValue: 'Inventory Asset', tab: 'Inventory', order: 14 }
    ];

    await Metadata.findOneAndUpdate(
      { entityName: 'Item' },
      { fields: itemFields },
      { upsert: true, new: true }
    );
    console.log('Item Metadata seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedMetadata();
