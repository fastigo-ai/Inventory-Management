import { ColumnDef } from "@tanstack/react-table"

export type DemandNoteTableRow = {
  isGroupRow?: boolean;
  activityName?: string;
  originalIdx?: number;
  tempCode?: string;
  materialCode?: string;
  itemName?: string;
  activity?: string;
  loaSrNo?: string;
  loaSerialNo?: string;
  unit?: string;
  demandQty?: number;
  
  // Computed values
  inStock?: number;
  circleLoaQty?: number;
  invoiceQty?: number;
  tillIssued?: number;
  consumption?: number;
  jmcDone?: number;
  contractorBalance?: number;
}

export const getDemandNoteColumns = (): ColumnDef<DemandNoteTableRow>[] => [
  {
    accessorKey: "originalIdx",
    header: "Sr No",
    size: 60,
    cell: (info) => (info.getValue() as number) + 1,
  },
  {
    accessorKey: "tempCode",
    header: "Material Code",
    size: 120,
    cell: (info) => (info.getValue() as string) || "-",
  },
  {
    accessorKey: "itemName",
    header: "Item Name",
    size: 250,
    cell: (info) => (
      <div className="max-w-[220px] truncate" title={info.getValue() as string}>
        {info.getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "activity",
    header: "Activity",
    size: 180,
    cell: (info) => (
      <div className="max-w-[160px] truncate" title={info.getValue() as string}>
        {(info.getValue() as string) || "-"}
      </div>
    ),
  },
  {
    accessorKey: "loaSrNo",
    header: "LOA Sr No",
    size: 100,
    cell: (info) => (info.getValue() as string) || "-",
  },
  {
    accessorKey: "circleLoaQty",
    header: "LOA Qty",
    size: 100,
    cell: (info) => {
      const val = info.getValue() as number;
      return <div className="text-center font-medium text-slate-700">{(val || val === 0) ? Math.round(val) : '-'}</div>;
    },
  },
  {
    accessorKey: "invoiceQty",
    header: "Invoice Qty",
    size: 110,
    cell: (info) => {
      const val = info.getValue() as number;
      return <div className="text-center font-medium text-slate-700">{(val || val === 0) ? Math.round(val) : '-'}</div>;
    },
  },
  {
    accessorKey: "unit",
    header: "Unit",
    size: 80,
    cell: (info) => (info.getValue() as string) || "Nos",
  },
  {
    accessorKey: "inStock",
    header: "In Stock",
    size: 100,
    cell: (info) => {
      const val = (info.getValue() as number) || 0;
      return <div className={`text-center font-bold ${val > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.round(val)}</div>;
    },
  },
  {
    accessorKey: "tillIssued",
    header: "Till Issued",
    size: 100,
    cell: (info) => {
      const val = (info.getValue() as number) || 0;
      return <div className="text-center font-medium text-blue-600">{Math.round(val)}</div>;
    },
  },
  {
    accessorKey: "consumption",
    header: "WIP Consumed",
    size: 120,
    cell: (info) => {
      const val = (info.getValue() as number) || 0;
      return <div className="text-center font-medium text-orange-600">{Math.round(val)}</div>;
    },
  },
  {
    accessorKey: "jmcDone",
    header: "JMC Done",
    size: 100,
    cell: (info) => {
      const val = (info.getValue() as number) || 0;
      return <div className="text-center font-medium text-purple-600">{Math.round(val)}</div>;
    },
  },
  {
    accessorKey: "contractorBalance",
    header: "Contractor Balance",
    size: 150,
    cell: (info) => {
      const val = (info.getValue() as number) || 0;
      return <div className="text-center font-bold text-teal-600">{Math.round(val)}</div>;
    },
  },
  {
    accessorKey: "demandQty",
    header: "Demand Qty",
    size: 120,
    cell: (info) => {
      const val = (info.getValue() as number) || 0;
      return <div className="text-center font-bold text-indigo-600 bg-indigo-50/50 p-2 rounded">{Math.round(val)}</div>;
    },
  },
]
