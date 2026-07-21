"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPurchaseInvoices, updatePurchaseInvoiceReceiptStatus } from "@/features/purchases/api/purchases.api";

export default function StoreReceiptsPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = () => {
    setLoading(true);
    getPurchaseInvoices()
      .then(res => setInvoices(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleReceive = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to approve this Invoice and receive items into inventory?")) return;
    try {
      await updatePurchaseInvoiceReceiptStatus(invoiceId, 'Received');
      fetchInvoices(); // Refresh list
    } catch (error) {
      console.error(error);
      alert("Failed to update receipt status");
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Store Receipts</h1>
            <p className="text-sm text-slate-500 mt-1">Approve incoming Purchase Invoices to receive items into inventory</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No incoming Invoices</h3>
              <p className="text-slate-500 mb-6">There are currently no Purchase Invoices pending receipt for your store.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">INVOICE NUMBER</th>
                  <th className="px-6 py-3">VENDOR</th>
                  <th className="px-6 py-3">DATE</th>
                  <th className="px-6 py-3">STATUS</th>
                  <th className="px-6 py-3">ITEMS</th>
                  <th className="px-6 py-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(invoice => (
                  <tr 
                    key={invoice._id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/purchases/invoices/${invoice._id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4">{invoice.vendorName || '-'}</td>
                    <td className="px-6 py-4">{new Date(invoice.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        invoice.receiptStatus === 'Received' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {invoice.receiptStatus || 'Pending Receipt'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{invoice.lineItems?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      {(invoice.receiptStatus === 'Pending Receipt' || !invoice.receiptStatus) ? (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReceive(invoice._id);
                          }}
                          className="h-8 bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve Receipt
                        </Button>
                      ) : (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/store/inventory/inward/${invoice._id}`);
                          }}
                          className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Register Inward
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
