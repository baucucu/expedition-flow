
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
  Mail,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpeditionActions } from "@/components/expedition-actions";
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
import type { Recipient, DocumentType, RecipientStatus, Expedition } from "@/types";

const recipientStatusVariant: { [key in RecipientStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  New: "outline",
  "Documents Generated": "secondary",
  Delivered: "default",
  Completed: "default",
  Returned: "destructive",
};

type RecipientRow = Recipient & { expeditionId: string; awb?: string, expeditionStatus: string };

interface ExpeditionDashboardProps {
    initialData: RecipientRow[];
    expeditions: Expedition[];
    onGenerateAWB: (id: string) => void;
    onManageDocuments: (expedition: Expedition) => void;
    onPrepareEmail: (expedition: Expedition) => void;
    onSendToLogistics: (id: string) => void;
}

const docShortNames: Record<DocumentType | 'AWB' | 'Email', string> = {
    'proces verbal de receptie': 'PV',
    'instructiuni pentru confirmarea primirii coletului': 'Instr.',
    'parcel inventory': 'Inv.',
    'AWB': 'AWB',
    'Email': 'Email'
}

type SelectedDocument = {
  recipient: RecipientRow;
  docType: DocumentType | 'AWB' | 'Email';
}

const DocumentPlaceholder = ({ title }: { title: string }) => (
    <div className="w-full h-[80vh] mt-4 border rounded-md bg-slate-50 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold">Document Placeholder</p>
            <p className="text-sm">{title}</p>
        </div>
    </div>
)


export const ExpeditionDashboard: React.FC<ExpeditionDashboardProps> = ({ 
    initialData, 
    expeditions,
    onGenerateAWB,
    onManageDocuments,
    onPrepareEmail,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<RecipientRow[]>(initialData);
  const [selectedDocument, setSelectedDocument] = React.useState<SelectedDocument | null>(null);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleOpenDocument = (recipient: RecipientRow, docType: DocumentType | 'AWB' | 'Email') => {
    setSelectedDocument({ recipient, docType });
  }

  const columns: ColumnDef<RecipientRow>[] = [
    {
        id: "expedition",
        header: "Expedition",
        cell: ({ row }) => {
            const expedition = expeditions.find(e => e.id === row.original.expeditionId);
            if (!expedition) return null;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{expedition.id}</span>
                    <span className="text-xs text-muted-foreground">{expedition.status}</span>
                </div>
            )
        }
    },
    {
      accessorKey: "name",
      header: "Recipient Name",
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "address",
      header: "Recipient Address",
      cell: ({ row }) => <div>{row.getValue("address")}</div>,
    },
    {
      accessorKey: "status",
      header: "Recipient Status",
      cell: ({ row }) => {
        const status: RecipientStatus = row.getValue("status");
        return (
          <Badge variant={recipientStatusVariant[status] || "default"} className="capitalize">
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
            const recipient = row.original;
            const docTypes: DocumentType[] = ['proces verbal de receptie', 'instructiuni pentru confirmarea primirii coletului', 'parcel inventory'];
            const emailSent = ['Sent to Logistics', 'In Transit', 'Canceled', 'Lost or Damaged'].includes(recipient.expeditionStatus);

            return (
                <div className="flex gap-2">
                    {docTypes.map(docType => {
                        const doc = recipient.documents[docType];
                        const isGenerated = doc.status === 'Generated' && doc.url;
                        if (!isGenerated) return null;
                        return (
                            <Badge
                                key={docType}
                                variant={"secondary"}
                                className={"cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"}
                                onClick={() => handleOpenDocument(recipient, docType)}
                            >
                                {docShortNames[docType]}
                            </Badge>
                        );
                    })}
                    {recipient.awb && (
                         <Badge
                            variant={"secondary"}
                            className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleOpenDocument(recipient, 'AWB')}
                        >
                            {docShortNames['AWB']}
                        </Badge>
                    )}
                    {emailSent && (
                        <Badge
                            variant={"secondary"}
                            className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
                            onClick={() => handleOpenDocument(recipient, 'Email')}
                        >
                            <Mail className="w-3 h-3" />
                            {docShortNames['Email']}
                        </Badge>
                    )}
                </div>
            );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const expedition = expeditions.find(e => e.id === row.original.expeditionId);
          if (!expedition) return null;
          
          return (
            <ExpeditionActions 
                expedition={expedition}
                onGenerateAWB={onGenerateAWB}
                onManageDocuments={onManageDocuments}
                onPrepareEmail={onPrepareEmail}
            />
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
          placeholder="Filter by recipient name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
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
                    <SheetTitle>Documents for Recipient: {selectedDocument.recipient.name} ({selectedDocument.recipient.id})</SheetTitle>
                    <SheetDescription>
                        Part of expedition {selectedDocument.recipient.expeditionId} with AWB: {selectedDocument.recipient.awb || 'N/A'}.
                    </SheetDescription>
                </SheetHeader>
                <Tabs defaultValue={selectedDocument.docType} className="py-4">
                    <TabsList>
                        <TabsTrigger value="proces verbal de receptie" disabled={selectedDocument.recipient.documents['proces verbal de receptie'].status !== 'Generated'}>Proces verbal</TabsTrigger>
                        <TabsTrigger value="instructiuni pentru confirmarea primirii coletului" disabled={selectedDocument.recipient.documents['instructiuni pentru confirmarea primirii coletului'].status !== 'Generated'}>Instructiuni</TabsTrigger>
                        <TabsTrigger value="parcel inventory" disabled={selectedDocument.recipient.documents['parcel inventory'].status !== 'Generated'}>Inventory</TabsTrigger>
                        <TabsTrigger value="AWB" disabled={!selectedDocument.recipient.awb}>AWB</TabsTrigger>
                        <TabsTrigger value="Email" disabled={!['Sent to Logistics', 'In Transit', 'Canceled', 'Lost or Damaged'].includes(selectedDocument.recipient.expeditionStatus)}>Email</TabsTrigger>
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
                        <DocumentPlaceholder title={`AWB Tracking: ${selectedDocument.recipient.awb}`} />
                    </TabsContent>
                    <TabsContent value="Email">
                        <DocumentPlaceholder title={`Email to Logistics for AWB: ${selectedDocument.recipient.awb}`} />
                    </TabsContent>
                </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
