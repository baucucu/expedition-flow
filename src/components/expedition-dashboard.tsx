
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Mail,
  Loader2,
  Send,
  FileText,
  FileSignature,
  Hourglass,
  ChevronDown,
  Filter,
  Check,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Recipient, DocumentType, RecipientStatus, Expedition, ExpeditionStatus, AWB, AWBStatus } from "@/types";
import { generateProcesVerbalAction } from "@/app/actions/document-actions";
import { queueShipmentAwbGenerationAction } from "@/app/actions/awb-actions";
import { useToast } from "@/hooks/use-toast";
import { DocumentViewer } from "./document-viewer";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";

const recipientStatusVariant: { [key in RecipientStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  New: "outline",
  "Documents Generated": "secondary",
  Delivered: "default",
  Completed: "default",
  Returned: "destructive",
};

const recipientStatuses: RecipientStatus[] = ['New', 'Documents Generated', 'Delivered', 'Completed', 'Returned'];

const awbStatusVariant: { [key in AWBStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  New: "outline",
  Queued: "secondary",
  Generated: "default",
  AWB_CREATED: "default",
  Failed: "destructive",
};

const awbStatuses: AWBStatus[] = ['New', 'Queued', 'Generated', 'AWB_CREATED', 'Failed'];


type RecipientRow = Recipient & { expeditionId: string; awb?: AWB, expeditionStatus: ExpeditionStatus };

interface ExpeditionDashboardProps {
    initialData: RecipientRow[];
    expeditions: Expedition[];
}

const docShortNames: Record<DocumentType | 'Email', string> = {
    'proces verbal de receptie': 'PV',
    'instructiuni pentru confirmarea primirii coletului': 'Instr.',
    'parcel inventory': 'Inv.',
    'AWB': 'AWB',
    'Email': 'Email',
    'PV': 'PV'
}

type SelectedDocument = {
  recipient: RecipientRow;
  docType: DocumentType;
}

const DocumentPlaceholder = ({ title }: { title: string }) => (
    <div className="w-full h-[80vh] mt-4 border rounded-md bg-slate-50 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold">Document Placeholder</p>
            <p className="text-sm">{title}</p>
        </div>
    </div>
)

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: any
  title: string
  options?: { label: string; value: string }[]
}

function DataTableColumnFilter<TData, TValue>({
  column,
  title,
  options
}: DataTableColumnHeaderProps<TData, TValue>) {
  
  const selectedValues = new Set(column.getFilterValue() as string[]);

  return (
     <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 border-dashed flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                {title}
                {selectedValues?.size > 0 && (
                <>
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal lg:hidden"
                    >
                    {selectedValues.size}
                    </Badge>
                    <div className="hidden space-x-1 lg:flex">
                    {selectedValues.size > 2 ? (
                        <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal"
                        >
                        {selectedValues.size} selected
                        </Badge>
                    ) : (
                        options
                        ?.filter((option) => selectedValues.has(option.value))
                        .map((option) => (
                            <Badge
                            variant="secondary"
                            key={option.value}
                            className="rounded-sm px-1 font-normal"
                            >
                            {option.label}
                            </Badge>
                        ))
                    )}
                    </div>
                </>
                )}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
            <DropdownMenuLabel>{title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options?.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                    <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                            const newSelectedValues = new Set(selectedValues);
                            if (checked) {
                                newSelectedValues.add(option.value);
                            } else {
                                newSelectedValues.delete(option.value);
                            }
                            const filterValues = Array.from(newSelectedValues);
                            column.setFilterValue(
                                filterValues.length ? filterValues : undefined
                            );
                        }}
                    >
                        {option.label}
                    </DropdownMenuCheckboxItem>
                );
            })}
             {selectedValues.size > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => column.setFilterValue(undefined)}
                  className="justify-center text-center"
                >
                  Clear filters
                </DropdownMenuItem>
              </>
            )}
        </DropdownMenuContent>
     </DropdownMenu>
  )
}


export const ExpeditionDashboard: React.FC<ExpeditionDashboardProps> = ({ 
    initialData, 
    expeditions,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<RecipientRow[]>(initialData);
  const [selectedDocument, setSelectedDocument] = React.useState<SelectedDocument | null>(null);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [isQueuingAwb, setIsQueuingAwb] = React.useState(false);
  const [isGeneratingPv, setIsGeneratingPv] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setData(initialData);
    // Do not reset selection when data/filters change from the parent scorecards
  }, [initialData]);
  
  const handleOpenDocument = (recipient: RecipientRow, docType: DocumentType) => {
    setSelectedDocument({ recipient, docType });
  }

  const handleQueueAwbs = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
        toast({
            variant: "destructive",
            title: "No Recipients Selected",
            description: "Please select one or more recipients.",
        });
        return;
    }

    // Filter out recipients whose AWBs are already generated or queued
    const awbsToProcess = selectedRows
      .map((row) => row.original)
      .filter((recipient) => {
        const status = recipient.awb?.status;
        return status !== 'Generated' && status !== 'Queued' && status !== 'AWB_CREATED';
      })
      .map(recipient => ({
          shipmentId: recipient.expeditionId,
          awbId: recipient.awbId
      }));

    if (awbsToProcess.length === 0) {
        toast({
            title: "Nothing to Queue",
            description: "All selected recipients already have a generated or queued AWB.",
        });
        return;
    }


    setIsQueuingAwb(true);
    const result = await queueShipmentAwbGenerationAction({ awbsToQueue: awbsToProcess });
    setIsQueuingAwb(false);
    
    if (result.success) {
        toast({
            title: "AWB Generation Queued",
            description: result.message,
        });
        table.resetRowSelection(); // Clear selection after action
    } else {
        toast({
            variant: "destructive",
            title: "Failed to Queue AWB Generation",
            description: result.message,
        });
    }
  }

  const handleGeneratePvs = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
        toast({ variant: "destructive", title: "No Recipients Selected" });
        return;
    }

    const recipientsToProcess = selectedRows
        .map(row => row.original)
        .map(({ id, name }) => ({ id, name }));

    setIsGeneratingPv(true);
    const result = await generateProcesVerbalAction({ recipients: recipientsToProcess });
    setIsGeneratingPv(false);
    
    if (result.success) {
        toast({
            title: "PV Generation Succeeded",
            description: result.message,
        });
        table.resetRowSelection();
    } else {
        toast({
            variant: "destructive",
            title: "PV Generation Failed",
            description: result.message,
        });
    }
  };

  const columns: ColumnDef<RecipientRow>[] = [
    {
        id: "select",
        header: ({ table }) => {
            const isAllFilteredSelected = table.getIsAllPageRowsSelected();
            const isSomeFilteredSelected = table.getIsSomePageRowsSelected();

            return (
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={isAllFilteredSelected}
                        onCheckedChange={(value) => {
                            table.toggleAllPageRowsSelected(!!value);
                        }}
                        aria-label="Select all on page"
                        data-state={isSomeFilteredSelected && !isAllFilteredSelected ? "indeterminate" : (isAllFilteredSelected ? "checked" : "unchecked")}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                             <DropdownMenuItem onSelect={() => table.toggleAllPageRowsSelected(true)}>
                                Select Page
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onSelect={() => {
                                    const allFilteredIds = table.getFilteredRowModel().rows.reduce((acc, row) => {
                                        acc[row.original.id] = true;
                                        return acc;
                                    }, {} as Record<string, boolean>);
                                    setRowSelection(allFilteredIds);
                                }}
                            >
                                Select All Filtered
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => table.resetRowSelection()}>
                                Deselect All
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "id",
        header: "Recipient ID",
        cell: ({ row }) => <div>{row.getValue("id")}</div>,
    },
    {
        accessorKey: "expeditionId",
        header: "Shipment ID",
        cell: ({ row }) => <div>{row.getValue("expeditionId")}</div>,
    },
    {
      accessorKey: "name",
      header: "Recipient Name",
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "schoolName",
      header: "Location",
      cell: ({ row }) => <div>{row.original.schoolName}</div>,
    },
    {
      accessorKey: "awb.address",
      header: "Recipient Address",
      cell: ({ row }) => <div>{row.original.awb?.address ?? 'N/A'}</div>,
    },
     {
      accessorKey: "awb.city",
      header: "City",
      cell: ({ row }) => <div>{row.original.awb?.city ?? 'N/A'}</div>,
    },
    {
      accessorKey: "awb.county",
      header: "County",
      cell: ({ row }) => <div>{row.original.awb?.county ?? 'N/A'}</div>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnFilter 
            column={column} 
            title="Recipient Status" 
            options={recipientStatuses.map(s => ({ value: s, label: s}))}
        />
      ),
      cell: ({ row }) => {
        const status: RecipientStatus = row.getValue("status");
        return (
          <Badge variant={recipientStatusVariant[status] || "default"} className="capitalize">
            {status}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
        accessorKey: "awb.status",
        header: ({ column }) => (
           <DataTableColumnFilter 
            column={column} 
            title="AWB Status" 
            options={awbStatuses.map(s => ({ value: s, label: s}))}
           />
        ),
        cell: ({ row }) => {
            const status: AWBStatus = row.original.awb?.status ?? 'New';
            return (
              <Badge variant={awbStatusVariant[status] || "outline"} className="capitalize">
                {status}
              </Badge>
            );
        },
        filterFn: (row, id, value) => {
            const status = row.original.awb?.status ?? 'New';
            return value.includes(status)
        },
    },
    {
        id: "documents",
        header: "Documents",
        cell: ({ row }) => {
            const recipient = row.original;
            const docTypes: DocumentType[] = ['instructiuni pentru confirmarea primirii coletului', 'parcel inventory'];
            const emailSent = ['Sent to Logistics', 'In Transit', 'Canceled', 'Lost or Damaged'].includes(recipient.expeditionStatus);

            return (
                <div className="flex gap-2">
                    {recipient.pvUrl && (
                         <Badge
                            variant={"secondary"}
                            className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
                            onClick={() => handleOpenDocument(recipient, 'PV')}
                        >
                            <FileText className="w-3 h-3" />
                            {docShortNames['PV']}
                        </Badge>
                    )}
                    {recipient.documents && docTypes.map(docType => {
                        const doc = recipient.documents[docType];
                        const isGenerated = doc?.status === 'Generated';
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
                    {recipient.awbWebviewUrl && (
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
                            onClick={() => handleOpenDocument(recipient, 'Email' as DocumentType)}
                        >
                            <Mail className="w-3 h-3" />
                            {docShortNames['Email']}
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
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
        const search = filterValue.toLowerCase();
        
        const rowValues = [
            row.original.id,
            row.original.expeditionId,
            row.original.name,
            row.original.awb?.address,
            row.original.awb?.city,
            row.original.awb?.county,
            row.original.schoolName,
            row.original.status,
            row.original.awb?.status,
            row.original.awb?.mainRecipientName,
            row.original.awb?.id
        ].filter(Boolean).join(' ').toLowerCase();

        return rowValues.includes(search);
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: true,
  });
  
  const selectedRowCount = Object.keys(rowSelection).length;

  return (
    <div className="w-full">
        <div className="flex items-center py-4 gap-4">
             <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ''}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="max-w-sm"
            />
             <Button 
                variant="outline"
                onClick={handleGeneratePvs}
                disabled={isGeneratingPv || selectedRowCount === 0}
             >
                {isGeneratingPv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                {isGeneratingPv
                    ? 'Generating...'
                    : `Generate PV for ${selectedRowCount} selected`
                }
             </Button>
             <Button 
                onClick={handleQueueAwbs} 
                disabled={isQueuingAwb || selectedRowCount === 0}
            >
                {isQueuingAwb ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hourglass className="mr-2 h-4 w-4" />}
                {isQueuingAwb 
                    ? 'Queuing...' 
                    : `Generate AWB(s) for ${selectedRowCount} selected`
                }
            </Button>
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
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
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
                        Part of shipment {selectedDocument.recipient.expeditionId} with AWB: {selectedDocument.recipient.awb?.mainRecipientName || 'N/A'}.
                    </SheetDescription>
                </SheetHeader>
                <Tabs defaultValue={selectedDocument.docType} className="py-4">
                    <TabsList>
                        <TabsTrigger value="PV" disabled={!selectedDocument.recipient.pvUrl}>Proces Verbal (PV)</TabsTrigger>
                        <TabsTrigger value="instructiuni pentru confirmarea primirii coletului" disabled={!selectedDocument.recipient.documents?.['instructiuni pentru confirmarea primirii coletului']?.url}>Instructiuni</TabsTrigger>
                        <TabsTrigger value="parcel inventory" disabled={!selectedDocument.recipient.documents?.['parcel inventory']?.url}>Inventory</TabsTrigger>
                        <TabsTrigger value="AWB" disabled={!selectedDocument.recipient.awbWebviewUrl}>AWB</TabsTrigger>
                        <TabsTrigger value="Email" disabled={!['Sent to Logistics', 'In Transit', 'Canceled', 'Lost or Damaged'].includes(selectedDocument.recipient.expeditionStatus)}>Email</TabsTrigger>
                    </TabsList>
                    <TabsContent value="PV">
                         {selectedDocument.recipient.pvUrl ? (
                            <DocumentViewer url={selectedDocument.recipient.pvUrl} docType="gdrive-pdf" />
                         ) : <DocumentPlaceholder title="Proces Verbal not available" />}
                    </TabsContent>
                    <TabsContent value="instructiuni pentru confirmarea primirii coletului">
                         {selectedDocument.recipient.documents?.['instructiuni pentru confirmarea primirii coletului']?.url ? (
                            <DocumentViewer url={selectedDocument.recipient.documents['instructiuni pentru confirmarea primirii coletului'].url!} docType="gdrive-pdf" />
                         ) : <DocumentPlaceholder title="Instructions not available" />}
                    </TabsContent>
                    <TabsContent value="parcel inventory">
                        {selectedDocument.recipient.documents?.['parcel inventory']?.url ? (
                            <DocumentViewer url={selectedDocument.recipient.documents['parcel inventory'].url!} docType="gdrive-excel" />
                         ) : <DocumentPlaceholder title="Parcel inventory not available" />}
                    </TabsContent>
                    <TabsContent value="AWB">
                        {selectedDocument.recipient.awbWebviewUrl ? (
                           <DocumentViewer url={selectedDocument.recipient.awbWebviewUrl} docType="gdrive-pdf" />
                        ) : <DocumentPlaceholder title={`AWB not available.`} /> }
                    </TabsContent>
                    <TabsContent value="Email">
                        <DocumentPlaceholder title={`Email to Logistics for AWB: ${selectedDocument.recipient.awb?.awbNumber}`} />
                    </TabsContent>
                </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
