import { useEffect, useState } from "react";
import { getItemUsage } from "@/features/items/api/items.api";
import { Loader2, FileText, ArrowRight, Package, Truck, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ItemUsageTabProps {
  itemId: string;
}

export function ItemUsageTab({ itemId }: ItemUsageTabProps) {
  const [usage, setUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setIsLoading(true);
        const data = await getItemUsage(itemId);
        setUsage(data);
      } catch (error) {
        console.error("Failed to fetch item usage", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsage();
  }, [itemId]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasUsage = usage && (
    usage.purchaseOrders?.length > 0 || 
    usage.dis?.length > 0 || 
    usage.purchaseInvoices?.length > 0 || 
    usage.purchaseReceives?.length > 0 || 
    usage.contractorAssignments?.length > 0
  );

  if (!hasUsage) {
    return (
      <div className="text-center py-10 text-slate-500">
        No usage found for this item.
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-10 animate-in fade-in slide-in-from-bottom-2">
      
      {/* 1. INBOUND ORDERS */}
      {(usage.purchaseOrders?.length > 0 || usage.dis?.length > 0) && (
        <div className="space-y-6">
          <div className="flex items-center text-indigo-700">
            <Package className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-semibold border-b border-indigo-100 pb-1 w-full">Inbound Orders</h2>
          </div>

          {usage.purchaseOrders?.length > 0 && (
            <div>
              <h3 className="text-[14px] font-medium text-slate-700 mb-3">Purchase Orders (PO)</h3>
              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600">PO Number</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Qty</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Rate</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-center">Status</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usage.purchaseOrders.map((po: any) => (
                      <tr key={po._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{po.purchaseOrderNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{po.date ? format(new Date(po.date), "dd MMM yyyy") : '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{po.vendorName}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold text-right">{po.quantity}</td>
                        <td className="px-4 py-3 text-slate-500 text-right">₹{po.rate?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{po.status || 'Draft'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/purchases/orders/${po._id}`} className="text-indigo-600 hover:text-indigo-700 flex items-center justify-end font-medium">
                            View <ArrowRight className="w-4 h-4 ml-1" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {usage.dis?.length > 0 && (
            <div>
              <h3 className="text-[14px] font-medium text-slate-700 mb-3">Dispatch Instructions (DI)</h3>
              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600">DI Number</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Instructed Qty</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-center">Status</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usage.dis.map((di: any) => (
                      <tr key={di._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{di.diNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{di.date ? format(new Date(di.date), "dd MMM yyyy") : '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{di.vendorName}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold text-right">{di.quantity}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{di.status || 'Active'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/di/edit/${di._id}`} className="text-indigo-600 hover:text-indigo-700 flex items-center justify-end font-medium">
                            View <ArrowRight className="w-4 h-4 ml-1" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. INBOUND RECEIPTS & INVOICES */}
      {(usage.purchaseInvoices?.length > 0 || usage.purchaseReceives?.length > 0) && (
        <div className="space-y-6">
          <div className="flex items-center text-emerald-700">
            <ArrowDownToLine className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-semibold border-b border-emerald-100 pb-1 w-full">Store Receipts & Invoices</h2>
          </div>

          {usage.purchaseInvoices?.length > 0 && (
            <div>
              <h3 className="text-[14px] font-medium text-slate-700 mb-3">Purchase Invoices (PI)</h3>
              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600">Invoice Number</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Invoiced Qty</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Rate</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usage.purchaseInvoices.map((pi: any) => (
                      <tr key={pi._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{pi.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{pi.date ? format(new Date(pi.date), "dd MMM yyyy") : '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{pi.vendorName}</td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold text-right">{pi.quantity}</td>
                        <td className="px-4 py-3 text-slate-500 text-right">₹{pi.rate?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{pi.status || 'Received'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {usage.purchaseReceives?.length > 0 && (
            <div>
              <h3 className="text-[14px] font-medium text-slate-700 mb-3">Purchase Receives (Store Inward)</h3>
              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600">PR Number</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Receive Date</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Invoice Qty</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-right">Accepted Qty (ACT)</th>
                      <th className="px-4 py-3 font-medium text-slate-600 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usage.purchaseReceives.map((pr: any) => (
                      <tr key={pr._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{pr.purchaseReceiveNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{pr.date ? format(new Date(pr.date), "dd MMM yyyy") : '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{pr.vendorName}</td>
                        <td className="px-4 py-3 text-slate-600 text-right">{pr.invoiceQuantity}</td>
                        <td className="px-4 py-3 text-emerald-700 font-bold text-right">{pr.acceptedQuantity}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">{pr.status || 'Received'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. OUTBOUND ISSUES */}
      {usage.contractorAssignments?.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center text-amber-700">
            <ArrowUpFromLine className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-semibold border-b border-amber-100 pb-1 w-full">Store Issues to Contractors</h2>
          </div>

          <div>
            <h3 className="text-[14px] font-medium text-slate-700 mb-3">Contractor Assignments (MIN)</h3>
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-600">MIN / Issue Number</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Contractor</th>
                    <th className="px-4 py-3 font-medium text-slate-600 text-right">Issued Qty</th>
                    <th className="px-4 py-3 font-medium text-slate-600 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usage.contractorAssignments.map((ca: any) => (
                    <tr key={ca._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{ca.assignmentNumber}</td>
                      <td className="px-4 py-3 text-slate-500">{ca.date ? format(new Date(ca.date), "dd MMM yyyy") : '-'}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{ca.contractorName}</td>
                      <td className="px-4 py-3 text-amber-700 font-bold text-right">{ca.quantity}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200">{ca.status || 'Issued'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
