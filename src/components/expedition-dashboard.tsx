
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
  Mail,
  X as XIcon,
  Loader2,
  Send,
  FileText,
  FileSignature,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Recipient, DocumentType, RecipientStatus, Expedition, ExpeditionStatus, AWB } from "@/types";
import { generateAwbAction, generateProcesVerbalAction } from "@/app/actions/expedition-actions";
import { useToast } from "@/hooks/use-toast";
import { DocumentViewer } from "./document-viewer";

const recipientStatusVariant: { [key in RecipientStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  New: "outline",
  "Documents Generated": "secondary",
  Delivered: "default",
  Completed: "default",
  Returned: "destructive",
};

type RecipientRow = Recipient & { expeditionId: string; awb?: AWB, expeditionStatus: ExpeditionStatus };

interface ExpeditionDashboardProps {
    initialData: RecipientRow[];
    expeditions: Expedition[];
}

const docShortNames: Record<DocumentType | 'AWB' | 'Email' | 'PV', string> = {
    'proces verbal de receptie': 'PV',
    'instructiuni pentru confirmarea primirii coletului': 'Instr.',
    'parcel inventory': 'Inv.',
    'AWB': 'AWB',
    'Email': 'Email',
    'PV': 'PV'
}

type SelectedDocument = {
  recipient: RecipientRow;
  docType: DocumentType | 'AWB' | 'Email' | 'PV';
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
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<RecipientRow[]>(initialData);
  const [selectedDocument, setSelectedDocument] = React.useState<SelectedDocument | null>(null);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [keywords, setKeywords] = React.useState<string[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isGeneratingAwb, setIsGeneratingAwb] = React.useState(false);
  const [isGeneratingPv, setIsGeneratingPv] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setData(initialData);
    setRowSelection({}); // Reset selection when data changes
  }, [initialData]);

  React.useEffect(() => {
    setGlobalFilter(keywords.join(' '));
  }, [keywords]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && inputValue.trim() !== '') {
        if (!keywords.includes(inputValue.trim())) {
            setKeywords([...keywords, inputValue.trim()]);
        }
        setInputValue('');
        event.preventDefault();
    } else if (event.key === 'Backspace' && inputValue === '' && keywords.length > 0) {
        removeKeyword(keywords[keywords.length - 1]);
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(keyword => keyword !== keywordToRemove));
  };


  const handleOpenDocument = (recipient: RecipientRow, docType: DocumentType | 'AWB' | 'Email' | 'PV') => {
    setSelectedDocument({ recipient, docType });
  }

  const handleGenerateAwbs = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
        toast({
            variant: "destructive",
            title: "No Recipients Selected",
            description: "Please select at least one recipient to generate an AWB for.",
        });
        return;
    }

    // Get unique shipment IDs from selected rows that are ready for AWB
    const shipmentIdsToProcess = [...new Set(
        selectedRows
            .map(row => row.original)
            .filter(recipient => recipient.expeditionStatus === 'Ready for AWB')
            .map(recipient => recipient.expeditionId)
    )];


    if (shipmentIdsToProcess.length === 0) {
        toast({
            variant: "destructive",
            title: "No Shipments Ready",
            description: "None of the selected recipients belong to a shipment that is 'Ready for AWB'.",
        });
        return;
    }

    setIsGeneratingAwb(true);
    const result = await generateAwbAction({ shipmentIds: shipmentIdsToProcess });
    setIsGeneratingAwb(false);
    
    if (result.success) {
        toast({
            title: "AWB Generation Started",
            description: result.message,
        });
        table.resetRowSelection(); // Clear selection after action
    } else {
        toast({
            variant: "destructive",
            title: "AWB Generation Failed",
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
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
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
      accessorKey: "address",
      header: "Recipient Address",
      cell: ({ row }) => <div>{row.getValue("address")}</div>,
    },
     {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => <div>{row.getValue("city")}</div>,
    },
    {
      accessorKey: "county",
      header: "County",
      cell: ({ row }) => <div>{row.getValue("county")}</div>,
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
        accessorKey: "awb.mainRecipientName",
        header: "AWB Name",
        cell: ({ row }) => row.original.awb?.mainRecipientName ?? <span className="text-muted-foreground">N/A</span>,
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
                    {recipient.awb?.awbNumber && (
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
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
        const search = filterValue.toLowerCase();
        const keywords = search.split(' ');
        
        const rowValues = [
            row.original.id,
            row.original.expeditionId,
            row.original.name,
            row.original.address,
            row.original.city,
            row.original.county,
            row.original.postalCode,
            row.original.status,
            row.original.awb?.mainRecipientName,
            row.original.awb?.id
        ].filter(Boolean).join(' ').toLowerCase();

        return keywords.every(keyword => rowValues.includes(keyword));
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });
  
  const selectedRowCount = Object.keys(rowSelection).length;

  return (
    <div className="w-full">
        <div className="flex items-center py-4 gap-4">
            <div 
                className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 flex-1"
                onClick={() => inputRef.current?.focus()}
            >
                <div className="flex flex-wrap gap-1">
                    {keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="pl-2 pr-1">
                            {keyword}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeKeyword(keyword);
                                }} 
                                className="ml-1 rounded-full p-0.5 hover:bg-background/50"
                            >
                                <XIcon className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                <Input
                    ref={inputRef}
                    placeholder={keywords.length === 0 ? "Search by any text and press Enter..." : ""}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-auto flex-1 border-none bg-transparent p-1 shadow-none focus-visible:ring-0"
                />
            </div>
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
                onClick={handleGenerateAwbs} 
                disabled={isGeneratingAwb || selectedRowCount === 0}
            >
                {isGeneratingAwb ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isGeneratingAwb 
                    ? 'Generating...' 
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
                        <TabsTrigger value="AWB" disabled={!selectedDocument.recipient.awb?.awbNumber}>AWB</TabsTrigger>
                        <TabsTrigger value="Email" disabled={!['Sent to Logistics', 'In Transit', 'Canceled', 'Lost or Damaged'].includes(selectedDocument.recipient.expeditionStatus)}>Email</TabsTrigger>
                    </TabsList>
                    <TabsContent value="PV">
                         {selectedDocument.recipient.pvUrl ? (
                            <DocumentViewer url={selectedDocument.recipient.pvUrl} docType="pdf" />
                         ) : <DocumentPlaceholder title="Proces verbal de receptie not available" />}
                    </TabsContent>
                    <TabsContent value="instructiuni pentru confirmarea primirii coletului">
                         {selectedDocument.recipient.documents?.['instructiuni pentru confirmarea primirii coletului']?.url ? (
                            <DocumentViewer url={selectedDocument.recipient.documents['instructiuni pentru confirmarea primirii coletului'].url!} docType="pdf" />
                         ) : <DocumentPlaceholder title="Instructions not available" />}
                    </TabsContent>
                    <TabsContent value="parcel inventory">
                        {selectedDocument.recipient.documents?.['parcel inventory']?.url ? (
                            <DocumentViewer url={selectedDocument.recipient.documents['parcel inventory'].url!} docType="excel" />
                         ) : <DocumentPlaceholder title="Parcel inventory not available" />}
                    </TabsContent>
                    <TabsContent value="AWB">
                        <DocumentPlaceholder title={`AWB Tracking: ${selectedDocument.recipient.awb?.awbNumber}`} />
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
