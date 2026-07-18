"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getAssignments } from "@/features/contractors/api/contractors.api";

export default function ContractorAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssignments()
      .then(res => setAssignments(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Contractor Assignments</h1>
            <p className="text-sm text-slate-500 mt-1">Manage stock issued/assigned to contractors (Invoices)</p>
          </div>
          <Link href="/contractors/assign">
            <Button className="bg-[#0076f2] hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New Assignment
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Assignments found</h3>
              <p className="text-slate-500 mb-6">Create a new assignment to issue stock to a contractor.</p>
              <Link href="/contractors/assign">
                <Button variant="outline">Create your first Assignment</Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">INVOICE #</th>
                  <th className="px-6 py-3">DATE</th>
                  <th className="px-6 py-3">CONTRACTOR</th>
                  <th className="px-6 py-3">STATUS</th>
                  <th className="px-6 py-3 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map(a => (
                  <tr key={a._id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-medium text-blue-600">{a.assignmentNumber}</td>
                    <td className="px-6 py-4">{new Date(a.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{a.contractorId?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        a.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">₹ {a.total?.toFixed(2)}</td>
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
