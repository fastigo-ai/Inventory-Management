import { useEffect, useState } from "react";
import { getItemUsage } from "@/features/items/api/items.api";
import { Loader2, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ItemUsageTabProps {
  itemId: string;
}

export function ItemUsageTab({ itemId }: ItemUsageTabProps) {
  const [usage, setUsage] = useState<{ purchaseOrders: any[], dis: any[] } | null>(null);
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

  if (!usage || (usage.purchaseOrders.length === 0 && usage.dis.length === 0)) {
    return (
      <div className="text-center py-10 text-slate-500">
        No usage found for this item.
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
      {usage.purchaseOrders.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold text-slate-800 mb-4 border-b pb-2">Purchase Orders</h3>
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">PO Number</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usage.purchaseOrders.map(po => (
                  <tr key={po._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{po.purchaseOrderNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{po.date ? format(new Date(po.date), "dd MMM yyyy") : '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{po.vendorName}</td>
                    <td className="px-4 py-3 text-slate-500">{po.status || 'Draft'}</td>
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

      {usage.dis.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold text-slate-800 mb-4 border-b pb-2">DI Registrations</h3>
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">DI Number</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usage.dis.map(di => (
                  <tr key={di._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{di.diNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{di.date ? format(new Date(di.date), "dd MMM yyyy") : '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{di.status || 'Draft'}</td>
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
  );
}
