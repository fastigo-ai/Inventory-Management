"use client";

import { useEffect, useState } from "react";
import { getStoreTransfers } from "@/features/store/api/store.api";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OutwardRegisterPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await getStoreTransfers();
      const allTransfers = res.data || [];
      
      // Filter for transfers that have been dispatched (IN_TRANSIT or RECEIVED)
      // In a real app with auth, we would filter by `fromStore === currentStoreCircle`
      const dispatchedTransfers = allTransfers.filter((t: any) => 
        t.status === 'IN_TRANSIT' || t.status === 'RECEIVED'
      );
      
      // Flatten items so each item is a row in the register
      const flatList: any[] = [];
      let srNo = 1;
      dispatchedTransfers.forEach((t: any) => {
        if (t.items && t.items.length > 0) {
          t.items.forEach((item: any) => {
            flatList.push({
              srNo: srNo++,
              id: t._id,
              date: t.requestDate,
              vendorName: t.vendorName || "-",
              description: item.description,
              unit: item.unit,
              transferQty: item.dispatchedQty || item.requestedQty,
              minBookNo: t.minBookNo || "-",
              minNo: t.minNo || "-",
              minDate: t.minDate,
              challanNo: t.challanNo || "-",
              challanDate: t.challanDate,
              fromStore: t.fromStore,
              toStore: t.toStore,
              transportName: t.transportName || "-",
              truckNumber: t.truckNumber || "-",
              grNumber: t.grNumber || "-",
              grDate: t.grDate,
              driverName: t.driverName || "-",
              driverMobile: t.driverMobile || "-",
              remarks: t.remarks || "-"
            });
          });
        }
      });

      setTransfers(flatList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString() : "-";

  return (
    <div className="flex-1 bg-white min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Transfer to Other Store (Outward Register)</h1>
          <Button 
            variant="outline"
            className="text-slate-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-200">Sr. No</th>
                  <th className="px-4 py-3 border-r border-slate-200">Date</th>
                  <th className="px-4 py-3 border-r border-slate-200">Name of Vendor</th>
                  <th className="px-4 py-3 border-r border-slate-200">Description of Material</th>
                  <th className="px-4 py-3 border-r border-slate-200">Unit</th>
                  <th className="px-4 py-3 border-r border-slate-200 bg-blue-50">Transfer Qty.</th>
                  <th className="px-4 py-3 border-r border-slate-200">MIN BOOK No.</th>
                  <th className="px-4 py-3 border-r border-slate-200">MIN No.</th>
                  <th className="px-4 py-3 border-r border-slate-200">MIN Date</th>
                  <th className="px-4 py-3 border-r border-slate-200">Challan No.</th>
                  <th className="px-4 py-3 border-r border-slate-200">Challan Date</th>
                  <th className="px-4 py-3 border-r border-slate-200">From</th>
                  <th className="px-4 py-3 border-r border-slate-200">To</th>
                  <th className="px-4 py-3 border-r border-slate-200">Transport</th>
                  <th className="px-4 py-3 border-r border-slate-200">Truck No.</th>
                  <th className="px-4 py-3 border-r border-slate-200">GR No.</th>
                  <th className="px-4 py-3 border-r border-slate-200">GR Date</th>
                  <th className="px-4 py-3 border-r border-slate-200">Driver Name</th>
                  <th className="px-4 py-3 border-r border-slate-200">Mobile No.</th>
                  <th className="px-4 py-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={20} className="px-6 py-8 text-center text-slate-500">Loading register...</td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="px-6 py-8 text-center text-slate-500">
                      No outward transfers found.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 border-r border-slate-100 text-center">{t.srNo}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">{t.vendorName}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{t.description}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{t.unit}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-blue-700 bg-blue-50/50">{t.transferQty}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{t.minBookNo}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-medium">{t.minNo}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{formatDate(t.minDate)}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{t.challanNo}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{formatDate(t.challanDate)}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-600">{t.fromStore}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">{t.toStore}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{t.transportName}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{t.truckNumber}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{t.grNumber}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{formatDate(t.grDate)}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{t.driverName}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{t.driverMobile}</td>
                      <td className="px-4 py-3 text-slate-500">{t.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
