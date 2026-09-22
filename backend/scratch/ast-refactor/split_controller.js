const { Project } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project();

const srcPath = path.resolve(__dirname, '../../src/modules/store/store.controller.ts');
const targetDir = path.resolve(__dirname, '../../src/modules/store');

// The groups of functions to keep in each controller
const groups = {
  'inward.controller.ts': [
    'getPendingDIs',
    'getDIPrefillData',
    'getPurchaseInvoicePrefillData',
    'createInwardEntry',
    'updateInwardEntry',
    'voidInwardEntry',
    'getInwardEntryById',
    'queryInwardEntries',
    'getInwardFilterOptions',
    'getAdminInwardEntries',
    'getStockSummary',
    'getAdminStockSummary',
    'importInwardRegistrations',
    'getPendingStoreReceipts',
    'getInwardRegister',
    'approveStoreReceipt',
    'bulkImportInwardEntries',
    'getStoreReceiptFilterOptions',
    'getInwardEntriesByInvoice',
    'bulkUpdateInwardEntries'
  ],
  'transfer.controller.ts': [
    'createStoreTransfer',
    'getStoreTransfers',
    'getStoreTransferById',
    'updateStoreTransfer',
    'deleteStoreTransfer',
    'updateStoreTransferStatus',
    'dispatchStoreTransfer',
    'receiveStoreTransfer',
    'importStoreTransfers',
    'importReceivedStoreTransfers'
  ],
  'mhrov.controller.ts': [
    'queryDILineItemsForMhrov',
    'getMhrovDIFilterOptions',
    'createMhrov',
    'getMhrovs',
    'exportMhrovs',
    'importMhrovs',
    'getMhrovDashboardData',
    'getMhrovById',
    'updateMhrov',
    'syncMhrovQuantities'
  ]
};

async function splitController() {
  for (const [filename, functionsToKeep] of Object.entries(groups)) {
    const destPath = path.join(targetDir, filename);
    fs.copyFileSync(srcPath, destPath);
    
    const sourceFile = project.addSourceFileAtPath(destPath);
    
    // Get all variable statements that are exported
    const exportedDeclarations = sourceFile.getVariableStatements().filter(v => v.isExported());
    
    for (const stmt of exportedDeclarations) {
      const declarations = stmt.getDeclarations();
      if (declarations.length > 0) {
        const name = declarations[0].getName();
        
        const allMainFunctions = [
          ...groups['inward.controller.ts'],
          ...groups['transfer.controller.ts'],
          ...groups['mhrov.controller.ts']
        ];
        
        if (allMainFunctions.includes(name) && !functionsToKeep.includes(name)) {
          console.log(`Removing ${name} from ${filename}`);
          stmt.remove();
        }
      }
    }

    // Exported async functions like export const syncMhrovQuantities = async () => {} 
    // are covered by VariableStatements. But regular function exports like:
    // export async function ...
    const exportedFunctions = sourceFile.getFunctions().filter(f => f.isExported());
    for (const func of exportedFunctions) {
      const name = func.getName();
      const allMainFunctions = [
        ...groups['inward.controller.ts'],
        ...groups['transfer.controller.ts'],
        ...groups['mhrov.controller.ts']
      ];
      if (name && allMainFunctions.includes(name) && !functionsToKeep.includes(name)) {
        console.log(`Removing function ${name} from ${filename}`);
        func.remove();
      }
    }

    sourceFile.fixUnusedIdentifiers();
    await sourceFile.save();
    console.log(`Successfully generated ${filename}`);
  }
}

splitController().catch(console.error);
