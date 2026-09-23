import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  ColumnPinningState,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ColumnOrderState,
} from "@tanstack/react-table"
import { Loader2, ArrowDown, ArrowUp, ArrowUpDown, Search, Settings2, Download, GripHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import * as XLSX from 'xlsx'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'


const DraggableTableHeader = ({ 
  header, 
  table, 
  enableColumnReordering, 
  enableSorting,
  getLeftOffset,
  getRightOffset
}: { 
  header: any; 
  table: any; 
  enableColumnReordering?: boolean;
  enableSorting?: boolean;
  getLeftOffset: (id: string) => number;
  getRightOffset: (id: string) => number;
}) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useSortable({
    id: header.column.id,
    disabled: !enableColumnReordering || header.column.getIsPinned() !== false || header.id === 'select'
  })

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: header.column.getIsPinned() ? "sticky" : "relative",
    transform: header.column.getIsPinned() ? undefined : CSS.Translate.toString(transform),
    zIndex: isDragging ? 40 : header.column.getIsPinned() ? 20 : 10,
    width: header.getSize(),
    minWidth: header.getSize(),
    maxWidth: header.getSize(),
    left: header.column.getIsPinned() === "left" ? `${getLeftOffset(header.column.id)}px` : undefined,
    right: header.column.getIsPinned() === "right" ? `${getRightOffset(header.column.id)}px` : undefined,
  }

  return (
    <th
      colSpan={header.colSpan}
      ref={setNodeRef}
      style={style}
      className={`px-4 py-3 align-middle font-semibold text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis ${
        header.column.getIsPinned() ? "bg-slate-100" : ""
      } border-r border-slate-200 last:border-r-0`}
    >
      <div className="flex items-center space-x-2">
        {enableColumnReordering && header.column.getIsPinned() === false && header.id !== 'select' && (
          <button {...attributes} {...listeners} className="cursor-grab hover:bg-slate-200 p-0.5 rounded focus:outline-none">
            <GripHorizontal className="h-4 w-4 text-slate-400" />
          </button>
        )}
        
        <div 
          className={`flex items-center ${header.column.getCanSort() && enableSorting ? 'cursor-pointer select-none hover:text-slate-900' : ''}`}
          onClick={header.column.getCanSort() && enableSorting ? header.column.getToggleSortingHandler() : undefined}
        >
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
          
          {{
            asc: <ArrowUp className="ml-1 h-3 w-3 inline-block" />,
            desc: <ArrowDown className="ml-1 h-3 w-3 inline-block" />,
          }[header.column.getIsSorted() as string] ?? (
            header.column.getCanSort() && enableSorting ? <ArrowUpDown className="ml-1 h-3 w-3 inline-block opacity-20" /> : null
          )}
        </div>
      </div>

      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize user-select-none touch-none ${
            header.column.getIsResizing()
              ? "bg-indigo-500 opacity-100"
              : "bg-slate-300 opacity-0 hover:opacity-100"
          } transition-opacity z-30`}
        />
      )}
    </th>
  )
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  initialPinning?: ColumnPinningState
  enableRowSelection?: boolean
  enableSorting?: boolean
  enableColumnReordering?: boolean
  enableExport?: boolean
  enableColumnVisibility?: boolean
  enableGlobalFilter?: boolean
  renderSubComponent?: (row: any) => React.ReactNode
  getIsGroupRow?: (row: any) => boolean
  pagination?: {
    totalItems: number;
    currentPage: number;
    limit: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  manualSorting?: boolean;
  sortingState?: SortingState;
  onSortChange?: (sorting: SortingState) => void;
  manualFiltering?: boolean;
  globalFilterState?: string;
  onSearch?: (searchStr: string) => void;
  onExport?: () => void;
  onRowClick?: (row: any) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  initialPinning = { left: [], right: [] },
  enableRowSelection = false,
  enableSorting = false,
  enableColumnReordering = false,
  enableExport = false,
  enableColumnVisibility = false,
  enableGlobalFilter = false,
  renderSubComponent,
  getIsGroupRow,
  pagination,
  onPageChange,
  onLimitChange,
  manualSorting = false,
  sortingState,
  onSortChange,
  manualFiltering = false,
  globalFilterState,
  onSearch,
  onExport,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(initialPinning)
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const sorting = sortingState !== undefined ? sortingState : internalSorting
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState("")
  const globalFilter = globalFilterState !== undefined ? globalFilterState : internalGlobalFilter
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])

  const finalColumns = React.useMemo(() => {
    let baseCols = [...columns]
    if (enableRowSelection) {
      baseCols.unshift({
        id: "select",
        size: 50,
        enableSorting: false,
        enableHiding: false,
        header: ({ table }: any) => (
          <div className="px-1">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value: any) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }: any) => (
          <div className="px-1">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value: any) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
      } as any)
    }
    return baseCols
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting && !manualSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableGlobalFilter && !manualFiltering ? getFilteredRowModel() : undefined,
    columnResizeMode: "onChange",
    manualSorting,
    manualFiltering,
    onSortingChange: (updaterOrValue) => {
      const newSorting = typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;
      if (onSortChange) onSortChange(newSorting);
      setInternalSorting(newSorting);
    },
    onGlobalFilterChange: (updaterOrValue) => {
      const newValue = typeof updaterOrValue === 'function' ? updaterOrValue(globalFilter) : updaterOrValue;
      if (onSearch) onSearch(String(newValue));
      setInternalGlobalFilter(String(newValue));
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    state: {
      columnPinning,
      sorting,
      globalFilter,
      columnVisibility,
      rowSelection,
      columnOrder,
    },
    onColumnPinningChange: setColumnPinning,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id as string)
        const newIndex = columnOrder.indexOf(over.id as string)
        return arrayMove(columnOrder, oldIndex, newIndex)
      })
    }
  }

  // Set initial column order if not set
  React.useEffect(() => {
    if (columnOrder.length === 0) {
      setColumnOrder(table.getAllLeafColumns().map(c => c.id))
    }
  }, [table, columnOrder.length])

  // Export handler
  const handleExportClick = () => {
    if (onExport) {
      onExport();
      return;
    }
    const visibleData = table.getFilteredRowModel().rows.map(row => row.original)
    const worksheet = XLSX.utils.json_to_sheet(visibleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
    XLSX.writeFile(workbook, "ExportedData.xlsx")
  }

  // TanStack's getStart() caches values during drag. We manually compute offsets so pinned columns snap perfectly during drag.
  const getLeftOffset = (colId: string) => {
    const leftPinned = table.getState().columnPinning.left || []
    let offset = 0
    for (const id of leftPinned) {
      if (id === colId) break
      offset += table.getColumn(id)?.getSize() || 0
    }
    return offset
  }

  const getRightOffset = (colId: string) => {
    const rightPinned = table.getState().columnPinning.right || []
    let offset = 0
    for (let i = rightPinned.length - 1; i >= 0; i--) {
      const id = rightPinned[i]
      if (id === colId) break
      offset += table.getColumn(id)?.getSize() || 0
    }
    return offset
  }

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      {(enableGlobalFilter || enableColumnVisibility || enableExport) && (
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            {enableGlobalFilter && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search all columns..."
                  value={globalFilter ?? ""}
                  onChange={(event) => table.setGlobalFilter(event.target.value)}
                  className="h-9 pl-8 w-[250px] bg-white border-slate-200"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400">
                  <Settings2 className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px] bg-white">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize cursor-pointer"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {enableExport && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportClick}
                className="h-9 bg-white border-slate-200 text-slate-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto" style={{ maxWidth: '100vw' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
        <table 
          className="text-sm text-left table-fixed bg-white" 
          style={{ width: table.getTotalSize() }}
        >
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  <SortableContext
                    items={headerGroup.headers.map(h => h.column.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <DraggableTableHeader
                        key={header.id}
                        header={header}
                        table={table}
                        enableColumnReordering={enableColumnReordering}
                        enableSorting={enableSorting}
                        getLeftOffset={getLeftOffset}
                        getRightOffset={getRightOffset}
                      />
                    ))}
                  </SortableContext>
                </tr>
              ))}
            </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (onRowClick && !getIsGroupRow?.(row) && !(row.original && (row.original as any).isGroupRow)) {
                      onRowClick(row.original)
                    }
                  }}
                >
                  {(getIsGroupRow && getIsGroupRow(row)) || (row.original && (row.original as any).isGroupRow) ? (
                    renderSubComponent ? renderSubComponent(row) : (
                      <td
                        colSpan={columns.length}
                        className="px-6 py-3 font-semibold text-slate-700 uppercase tracking-wider text-xs bg-slate-100/80 border-y border-slate-200 sticky left-0 z-20 overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {(row.original as any).activityName}
                      </td>
                    )
                  ) : (
                    row.getVisibleCells().map((cell) => {
                      const isPinned = cell.column.getIsPinned()
                      return (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 align-middle text-sm ${
                            isPinned ? "bg-white z-10" : "z-0"
                          } text-slate-600 border-r border-slate-100 last:border-r-0`}
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                            position: isPinned ? "sticky" : "relative",
                            left: isPinned === "left" ? `${getLeftOffset(cell.column.id)}px` : undefined,
                            right: isPinned === "right" ? `${getRightOffset(cell.column.id)}px` : undefined,
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </DndContext>
        </div>
      </div>

      {pagination && pagination.totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 px-4 py-3 bg-white sm:px-6 h-16 rounded-b-md">
          
          <div className="flex items-center text-[13px] text-slate-500 w-full sm:w-1/3 justify-center sm:justify-start mb-4 sm:mb-0">
             Showing {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} out of {pagination.totalItems}
          </div>

          <div className="flex items-center justify-center space-x-1 w-full sm:w-1/3 mb-4 sm:mb-0">
            <button
              onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
            
            <div className="flex items-center space-x-1">
              {(() => {
                const pages = [];
                const { currentPage, totalPages } = pagination;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + 5);
                if (endPage - startPage < 5) startPage = Math.max(1, endPage - 5);
                
                for (let i = startPage; i <= endPage; i++) pages.push(i);
                if (endPage < totalPages) pages.push('...');
                
                return pages.map((pageNum, idx) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-sm tracking-widest">...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange && onPageChange(pageNum as number)}
                      className={`min-w-[28px] h-[28px] flex items-center justify-center text-[13px] transition-colors ${
                        pageNum === pagination.currentPage
                          ? 'border border-[#0099ab] text-[#0099ab] rounded-[4px] font-medium'
                          : 'text-slate-500 hover:text-slate-800 rounded-[4px]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                ));
              })()}
            </div>

            <button
              onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center justify-center sm:justify-end space-x-3 text-[13px] text-slate-500 w-full sm:w-1/3">
             <span>Rows per page</span>
             {onLimitChange && (
               <select
                  className="h-8 rounded-[4px] border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  value={pagination.limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
               >
                  {[10, 16, 20, 50, 100, 250, 450, 550, 650, 1000, 1500, 2000, 2500, 3000].map(limit => (
                    <option key={limit} value={limit}>{limit}</option>
                  ))}
               </select>
             )}
          </div>
        </div>
      )}
    </div>
  )
}
