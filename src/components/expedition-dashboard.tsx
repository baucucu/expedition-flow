
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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


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

const docShortNames: Record<DocumentType | 'AWB', string> = {
    'proces verbal de receptie': 'PV',
    'instructiuni pentru confirmarea primirii coletului': 'Instr.',
    'parcel inventory': 'Inv.',
    'AWB': 'AWB'
}

type SelectedDocument = {
  expedition: Expedition;
  docType: DocumentType | 'AWB';
}

const DocumentPlaceholder = ({ title }: { title: string }) => (
    <div className="w-full h-[80vh] mt-4 border rounded-md bg-slate-50 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold">Document Placeholder</p>
            <p className="text-sm">{title}</p>
        </div>
    </div>
)


export const ExpeditionDashboard: React.FC<ExpeditionDashboardProps> = ({ initialData }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<Expedition[]>(initialData);
  const [selectedDocument, setSelectedDocument] = React.useState<SelectedDocument | null>(null);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleOpenDocument = (expedition: Expedition, docType: DocumentType | 'AWB') => {
    setSelectedDocument({ expedition, docType });
  }

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
            const docTypes: DocumentType[] = ['proces verbal de receptie', 'instructiuni pentru confirmarea primirii coletului', 'parcel inventory'];
            return (
                <div className="flex gap-2">
                    {docTypes.map(docType => {
                        const doc = expedition.documents[docType];
                        const isGenerated = doc.status === 'Generated' && doc.url;
                        if (!isGenerated) return null;
                        return (
                            <Badge
                                key={docType}
                                variant={"secondary"}
                                className={"cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"}
                                onClick={() => handleOpenDocument(expedition, docType)}
                            >
                                {docShortNames[docType]}
                            </Badge>
                        );
                    })}
                    {expedition.awb && (
                         <Badge
                            variant={"secondary"}
                            className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleOpenDocument(expedition, 'AWB')}
                        >
                            {docShortNames['AWB']}
                        </Badge>
                    )}
                </div>
            );
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

      <Sheet open={!!selectedDocument} onOpenChange={(isOpen) => !isOpen && setSelectedDocument(null)}>
        <SheetContent className="w-full sm:w-2/3 lg:w-2/3 sm:max-w-none">
          {selectedDocument && (
            <>
                <SheetHeader>
                    <SheetTitle>Expedition Documents: {selectedDocument.expedition.id}</SheetTitle>
                    <SheetDescription>
                        Review documents for the expedition to {selectedDocument.expedition.recipientName}.
                    </SheetDescription>
                </SheetHeader>
                <Tabs defaultValue={selectedDocument.docType} className="py-4">
                    <TabsList>
                        <TabsTrigger value="proces verbal de receptie" disabled={selectedDocument.expedition.documents['proces verbal de receptie'].status !== 'Generated'}>Proces verbal</TabsTrigger>
                        <TabsTrigger value="instructiuni pentru confirmarea primirii coletului" disabled={selectedDocument.expedition.documents['instructiuni pentru confirmarea primirii coletului'].status !== 'Generated'}>Instructiuni</TabsTrigger>
                        <TabsTrigger value="parcel inventory" disabled={selectedDocument.expedition.documents['parcel inventory'].status !== 'Generated'}>Inventory</TabsTrigger>
                        <TabsTrigger value="AWB" disabled={!selectedDocument.expedition.awb}>AWB</TabsTrigger>
                    </TabsList>
                    <TabsContent value="proces verbal de receptie">
                        <DocumentPlaceholder title="Proces verbal de receptie" />
                    </TabsContent>
                    <TabsContent value="instructiuni pentru confirmarea primirii coletului">
                        <DocumentPlaceholder title="Instructiuni pentru confirmarea primirii coletului" />
                    </TabsContent>
                    <TabsContent value="parcel inventory">
                        <DocumentPlaceholder title="Parcel Inventory" />
                    </TabsContent>
                    <TabsContent value="AWB">
                        <DocumentPlaceholder title={`AWB Tracking: ${selectedDocument.expedition.awb}`} />
                    </TabsContent>
                </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
