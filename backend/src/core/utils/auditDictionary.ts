export const AuditDictionary: Record<string, string> = {
  // General Fields
  'status': 'Status',
  'isApproved': 'Approval Status',
  'approvedQty': 'Approved Quantity',
  'approvedBy': 'Approved By',
  'approvedAt': 'Approval Date',
  'isDeleted': 'Deletion Status',
  'remarks': 'Remarks / Comments',
  'notes': 'Notes',
  
  // Entities
  'supplierId': 'Supplier Name',
  'contractorId': 'Contractor Name',
  'storeId': 'Store Name',
  'circleId': 'Circle Name',
  'itemId': 'Item Name',
  
  // Specific Quantities
  'reqQty': 'Requested Quantity',
  'receivedQty': 'Received Quantity',
  'acceptedQty': 'Accepted Quantity',
  'rejectedQty': 'Rejected Quantity',
  'claimedQty': 'Claimed Quantity',
  'dispatchedQty': 'Dispatched Quantity',
  'issuedQty': 'Issued Quantity',
  'returnedQty': 'Returned Quantity',
  'quantity': 'Quantity',

  // Identifiers & Numbers
  'loaSrNo': 'LOA Serial Number',
  'invoiceNo': 'Invoice Number',
  'invoiceDate': 'Invoice Date',
  'dcNo': 'Delivery Challan Number',
  'vehicleNo': 'Vehicle Number',
  'ewayBillNo': 'E-Way Bill Number',
  
  // Costing
  'rate': 'Rate',
  'amount': 'Amount',
  'taxAmount': 'Tax Amount',
  'totalAmount': 'Total Amount'
};

/**
 * Translates a technical field path (e.g. "items[2].reqQty") into a human-readable string.
 */
export const translateAuditField = (fieldPath: string): string => {
  if (!fieldPath) return '';
  
  // Extract array indices e.g., items[2].reqQty -> items.reqQty and index = 2
  const arrayMatch = fieldPath.match(/(.+)\[(\d+)\]\.(.+)/);
  if (arrayMatch) {
    const [, arrayName, index, subField] = arrayMatch;
    const arrayLabel = AuditDictionary[arrayName] || arrayName.charAt(0).toUpperCase() + arrayName.slice(1);
    const subLabel = AuditDictionary[subField] || subField;
    return `${subLabel} (on ${arrayLabel} #${parseInt(index) + 1})`;
  }

  // Handle direct array edits e.g., items[2] -> Item #3
  const directArrayMatch = fieldPath.match(/(.+)\[(\d+)\]$/);
  if (directArrayMatch) {
    const [, arrayName, index] = directArrayMatch;
    const arrayLabel = AuditDictionary[arrayName] || arrayName.charAt(0).toUpperCase() + arrayName.slice(1);
    return `${arrayLabel} #${parseInt(index) + 1}`;
  }

  // Fallback to direct mapping
  if (AuditDictionary[fieldPath]) {
    return AuditDictionary[fieldPath];
  }

  // If camelCase, try to split it into Title Case
  const camelCaseToTitle = fieldPath
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
    
  return camelCaseToTitle;
};
