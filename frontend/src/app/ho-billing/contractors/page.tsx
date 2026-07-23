"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Users } from "lucide-react";

const LOCATIONS = [
  { name: "Solan", id: "Solan" },
  { name: "Nahan", id: "Nahan" },
  { name: "Rampur", id: "Rampur" },
  { name: "Rohru", id: "Rohru" }
];

export default function HOBillingContractorsPage() {
  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">HO Billing Portal - Contractors</h1>
          <p className="text-sm text-slate-500 mt-1">Select a location to view or manage contractors</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {LOCATIONS.map((loc) => (
            <Link 
              key={loc.id} 
              href={`/ho-billing/contractors/${loc.id}`}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all hover:border-blue-300 group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{loc.name}</h3>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <Users className="w-4 h-4" />
                View Contractors
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
