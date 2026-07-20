import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewPurchaseInvoicePage from '@/app/purchases/invoices/new/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock APIs
jest.mock('@/features/purchases/api/purchases.api', () => ({
  createPurchaseInvoice: jest.fn().mockResolvedValue({}),
  getNextPurchaseInvoiceNumber: jest.fn().mockResolvedValue({ data: { fullNumber: 'INV-1001' } }),
}));

jest.mock('@/features/vendors/api/vendors.api', () => ({
  getVendors: jest.fn().mockResolvedValue({ vendors: [{ _id: 'v1', dynamicData: { companyName: 'Test Vendor' } }] }),
}));

jest.mock('@/features/items/api/items.api', () => ({
  getItems: jest.fn().mockResolvedValue({
    items: [
      { _id: 'i1', dynamicData: { name: 'Item 1', tempCode: 'T1', price: 100 } },
      { _id: 'i2', dynamicData: { name: 'Item 2', tempCode: 'T2', price: 200 } },
    ]
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

describe('NewPurchaseInvoicePage - CSV Import', () => {
  it('should parse CSV and add items to the invoice line items', async () => {
    const user = userEvent.setup();
    render(<NewPurchaseInvoicePage />);
    
    // Wait for the component to load initial data
    await waitFor(() => {
      expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
    });
    
    // Open the Bulk Modal
    const bulkButton = screen.getByText('Bulk Actions');
    await user.click(bulkButton);
    
    // Check that the modal opened
    expect(screen.getByText('Add Items in Bulk')).toBeInTheDocument();
    
    // Create a dummy CSV File
    // CSV format expected: 'Item ID', 'Temp Code', 'Item Name', 'Description', 'HSN Code', 'Package', 'Circle', 'Quantity', 'Rate', 'Amount'
    const csvContent = [
      'Item ID,Temp Code,Item Name,Description,HSN Code,Package,Circle,Quantity,Rate,Amount',
      'i1,T1,Item 1,,,,,5,100,500',
      'i2,T2,Item 2,,,,,2,250,500'
    ].join('\n');
    
    const file = new File([csvContent], 'test_items.csv', { type: 'text/csv' });
    
    // The input type="file" is hidden, but testing-library can find it by its type/accept or label. 
    // Since it's hidden and has no label, we might need to find it using querySelector or testing-library's getByTestId if we added one. 
    // However, it's just the only input[type="file"] in the document.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    
    await waitFor(() => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    // We expect the FileReader to load and process the CSV asynchronously.
    // So we wait for the table rows to appear in the main form (which replaces the empty state).
    
    await waitFor(() => {
      // The modal should close
      expect(screen.queryByText('Add Items in Bulk')).not.toBeInTheDocument();
      // The line items should be updated
      const qtyInputs = screen.getAllByDisplayValue('5');
      expect(qtyInputs.length).toBeGreaterThan(0);
      const rateInputs = screen.getAllByDisplayValue('250');
      expect(rateInputs.length).toBeGreaterThan(0);
    });
  });
});
