"use client";
import React from 'react';
import Link from 'next/link';
import { PackageOpen, Building2, Store, Users, BarChart4 } from 'lucide-react';

export default function ReportsDashboard() {
  const reports = [
    {
      title: "Vendor Summary",
      description: "Analyze total ordered value, invoiced quantities, and pending liabilities per vendor.",
      icon: <Building2 className="w-8 h-8 text-indigo-500" />,
      href: "/reports/vendor-summary",
      color: "bg-indigo-50 border-indigo-100 group-hover:border-indigo-300"
    },
    {
      title: "Item Summary",
      description: "Track the lifecycle of each item across LOA, BOM, Dispatch Instructions, and Invoices.",
      icon: <PackageOpen className="w-8 h-8 text-emerald-500" />,
      href: "/reports/item-summary",
      color: "bg-emerald-50 border-emerald-100 group-hover:border-emerald-300"
    },
    {
      title: "Contractor Summary",
      description: "Monitor total materials issued vs total work billed to calculate unbilled liability.",
      icon: <Users className="w-8 h-8 text-amber-500" />,
      href: "/reports/contractor-summary",
      color: "bg-amber-50 border-amber-100 group-hover:border-amber-300"
    },
    {
      title: "Store Itemised Summary",
      description: "FROM CIRCLE STORE (Item Wise): Track real-time Total Receipts, MIN Issues, Returns, Transfers, and Net Balance at Store per item.",
      icon: <Store className="w-8 h-8 text-blue-500" />,
      href: "/reports/store-summary",
      color: "bg-blue-50 border-blue-100 group-hover:border-blue-300"
    },
    {
      title: "Store Contractor Summary",
      description: "FROM CIRCLE STORE (Contractor Wise): Track Total Issued Qty, Total Return Qty, and Total Balance Qty in contractor custody.",
      icon: <Users className="w-8 h-8 text-indigo-500" />,
      href: "/reports/store-contractor-summary",
      color: "bg-indigo-50 border-indigo-100 group-hover:border-indigo-300"
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#f8fafc]">
      <div className="bg-white border-b border-slate-200 px-8 py-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BarChart4 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Analytics & Reports</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Comprehensive business intelligence across all modules.</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report, idx) => (
            <Link key={idx} href={report.href} className="group block h-full">
              <div className={`h-full bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative`}>
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full transition-colors duration-300 ${report.color} opacity-20`}></div>
                
                <div className="flex items-start gap-5 relative z-10">
                  <div className={`p-4 rounded-xl transition-colors duration-300 ${report.color}`}>
                    {report.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{report.title}</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">{report.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
