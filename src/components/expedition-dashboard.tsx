
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  FileText,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Expedition, ExpeditionStatus, DocumentType } from "@/types";

const statusVariant: { [key in ExpeditionStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  New: "outline",
  "Documents Generated": "secondary",
  "AWB Generated": "secondary",
  "Sent to Logistics": "secondary",
  "In Transit": "default",
  Delivered: "default",
  Completed: "default",
  Canceled: "destructive",
  "Lost or Damaged": "destructive",
  Returned: "destructive",
};

interface ExpeditionDashboardProps {
    initialData: Expedition[];
}

const docShortNames: Record<DocumentType, string> = {
    'proces verbal de receptie': 'PV',
    'instructiuni pentru confirmarea primirii coletului': 'Instr.',
    'parcel inventory': 'Inv.'
}

const DocumentLinkBadge: React.FC<{docType: DocumentType, expedition: Expedition}> = ({ docType, expedition }) => {
    const doc = expedition.documents[docType];
    if (doc.status !== 'Generated' || !doc.url) {
        return <Badge variant="outline" className="font-normal">{docShortNames[docType]}</Badge>
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Badge 
                    variant="secondary" 
                    className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                >
                    {docShortNames[docType]}
                </Badge>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{docType}</SheetTitle>
                    <SheetDescription>
                       Document for expedition {expedition.id}.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    {/* In a real app, this would be an iframe or a more robust viewer */}
                    <p>Displaying content for: {docType}</p>
                    <iframe src={doc.url} className="w-full h-96 mt-4 border rounded-md" title={docType} />
                </div>
            </SheetContent>
        </Sheet>
    )
}

const AWBLinkBadge: React.FC<{expedition: Expedition}> = ({ expedition }) => {
    if (!expedition.awb) {
        return <Badge variant="outline" className="font-normal">AWB</Badge>
    }

    const trackingUrl = `https://www.courier-tracking-placeholder.com/track?id=${expedition.awb}`;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Badge
                    variant="secondary"
                    className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                >
                    AWB
                </Badge>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>AWB Tracking: {expedition.awb}</SheetTitle>
                    <SheetDescription>
                       Live tracking information for expedition {expedition.id}.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                     <iframe src={trackingUrl} className="w-full h-96 mt-4 border rounded-md" title={`AWB Tracking for ${expedition.awb}`} />
                </div>
            </SheetContent>
        </Sheet>
    )
}

export const ExpeditionDashboard: React.FC<ExpeditionDashboardProps> = ({ initialData }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<Expedition[]>(initialData);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const columns: ColumnDef<Expedition>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="lowercase">{row.getValue("id")}</div>,
    },
    {
        accessorKey: "recipientName",
        header: "Recipient Name",
        cell: ({ row }) => <div>{row.getValue("recipientName")}</div>,
    },
    {
        accessorKey: "recipientAddress",
        header: "Recipient Address",
        cell: ({ row }) => <div>{row.getValue("recipientAddress")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status: ExpeditionStatus = row.getValue("status");
        return (
          <Badge variant={statusVariant[status] || "default"} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
        accessorKey: "awb",
        header: "AWB",
        cell: ({ row }) => row.getValue("awb") ? <div>{row.getValue("awb")}</div> : <span className="text-muted-foreground">N/A</span>,
    },
    {
        id: "documents",
        header: "Documents",
        cell: ({ row }) => {
          const expedition = row.original;
          return (
            <div className="flex gap-2">
                <DocumentLinkBadge docType="proces verbal de receptie" expedition={expedition} />
                <DocumentLinkBadge docType="instructiuni pentru confirmarea primirii coletului" expedition={expedition} />
                <DocumentLinkBadge docType="parcel inventory" expedition={expedition} />
                <AWBLinkBadge expedition={expedition} />
            </div>
          )
        },
      },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by recipient..."
          value={(table.getColumn("recipientName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("recipientName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s) displayed.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
