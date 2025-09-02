
"use client";

import * as React from "react";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from "@tanstack/react-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast";
import { DocumentViewer } from "../document-viewer";
import { sendEmailToLogisticsAction } from "@/app/actions/email-actions";
import { generateProcesVerbalAction } from "@/app/actions/document-actions";
import { queueShipmentAwbGenerationAction } from "@/app/actions/awb-actions";
import { 
    RecipientRow, 
    ExpeditionDashboardProps, 
    SelectedDocument, 
    DocType,
} from "./types";
import { DataTable } from "@/components/expedition-dashboard/data-table";
import { columns } from "@/components/expedition-dashboard/columns";
import { Toolbar } from "@/components/expedition-dashboard/toolbar";
import { Pagination } from "@/components/expedition-dashboard/pagination";
import { DocumentPlaceholder } from "@/components/expedition-dashboard/document-placeholder";
import { Button } from "../ui/button";
import { ExternalLink } from "lucide-react";

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
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [pvFilter, setPvFilter] = React.useState<'all' | 'has_pv' | 'no_pv'>('all');
  const { toast } = useToast();

  React.useEffect(() => {
    let filteredData = initialData;
    if (pvFilter === 'has_pv') {
      filteredData = filteredData.filter(row => row.pvStatus === 'Generated');
    } else if (pvFilter === 'no_pv') {
      filteredData = filteredData.filter(row => row.pvStatus !== 'Generated');
    }
    setData(filteredData);
  }, [initialData, pvFilter]);
  
  const handleOpenDocument = (recipient: RecipientRow, docType: DocType) => {
    setSelectedDocument({ recipient, docType });
  }

  const table = useReactTable({
    data,
    columns: columns(handleOpenDocument, setRowSelection),
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
    getRowId: (row) => row.id,
    globalFilterFn: (row, columnId, filterValue) => {
        const search = filterValue.toLowerCase();
        
        const rowValues = [
            row.original.numericId,
            row.original.id,
            row.original.expeditionId,
            row.original.name,
            row.original.awb?.address,
            row.original.awb?.city,
            row.original.awb?.county,
            row.original.telephone,
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

  const getSelectedRecipients = React.useCallback(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast({
          variant: "destructive",
          title: "No Recipients Selected",
          description: "Please select one or more recipients.",
      });
      return [];
    }
    return selectedRows.map(row => row.original);
  }, [table, toast]);


  const handleGeneratePvs = async () => {
    const selectedRecipients = getSelectedRecipients();
    if (selectedRecipients.length === 0) return;

    const recipientsToProcess = selectedRecipients.map(row => ({
        id: row.id,
        name: row.name,
        shipmentId: row.shipmentId,
        numericId: row.numericId
    }));
    console.log("selected recipients for pv generation",{recipientsToProcess})
    setIsGeneratingPv(true);
    const result = await generateProcesVerbalAction(recipientsToProcess);
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

  const handleQueueAwbs = async () => {
    const selectedRecipients = getSelectedRecipients();
    if (selectedRecipients.length === 0) return;

    const awbsToProcess = selectedRecipients
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
        table.resetRowSelection();
    } else {
        toast({
            variant: "destructive",
            title: "Failed to Queue AWB Generation",
            description: result.message,
        });
    }
  }

  const handleSendEmails = async () => {
    const selectedRecipients = getSelectedRecipients();
    if (selectedRecipients.length === 0) return;

    const recipientIds = selectedRecipients.map(r => r.id);

    setIsSendingEmail(true);
    const result = await sendEmailToLogisticsAction({ recipientIds });
    setIsSendingEmail(false);

    if (result.success) {
        toast({
            title: "Email Process Queued",
            description: result.message
        });
        table.resetRowSelection();
    } else {
        toast({
            variant: "destructive",
            title: "Failed to Queue Emails",
            description: result.message,
        });
    }
  }

  return (
    <div className="w-full">
        <Toolbar 
            table={table}
            pvFilter={pvFilter}
            setPvFilter={setPvFilter}
            isSendingEmail={isSendingEmail}
            handleSendEmails={handleSendEmails}
            isGeneratingPv={isGeneratingPv}
            handleGeneratePvs={handleGeneratePvs}
            isQueuingAwb={isQueuingAwb}
            handleQueueAwbs={handleQueueAwbs}
        />
      <DataTable table={table} />
      <Pagination table={table} />

      <Sheet open={!!selectedDocument} onOpenChange={(isOpen) => !isOpen && setSelectedDocument(null)}>
        <SheetContent className="sm:max-w-[80vw]">
          {selectedDocument && (
            <>
                <SheetHeader>
                    <SheetTitle>Documents for Recipient: {selectedDocument.recipient.name} ({selectedDocument.recipient.numericId})</SheetTitle>
                    <SheetDescription>
                        Part of shipment {selectedDocument.recipient.expeditionId} with AWB: {selectedDocument.recipient.awb?.mainRecipientName || 'N/A'}.
                    </SheetDescription>
                </SheetHeader>
                <Tabs defaultValue={selectedDocument.docType} className="py-4">
                    <TabsList>
                        <TabsTrigger value="PV" disabled={selectedDocument.recipient.pvStatus !== 'Generated'}>Proces Verbal (PV)</TabsTrigger>
                        <TabsTrigger value="PV Semnat" disabled={!selectedDocument.recipient.pvSemnatUrl}>PV Semnat</TabsTrigger>
                        <TabsTrigger value="Instructions" disabled={selectedDocument.recipient.instructionsStatus !== 'Generated'}>Instructions</TabsTrigger>
                        <TabsTrigger value="Inventory" disabled={selectedDocument.recipient.inventoryStatus !== 'Generated'}>Inventory</TabsTrigger>
                        <TabsTrigger value="AWB" disabled={selectedDocument.recipient.awbStatus !== 'Generated'}>AWB</TabsTrigger>
                        <TabsTrigger value="Email" disabled={!selectedDocument.recipient.emailId}>Email</TabsTrigger>
                    </TabsList>
                    <TabsContent value="PV">
                         {selectedDocument.recipient.pvUrl ? (
                            <DocumentViewer url={selectedDocument.recipient.pvUrl} docType="pdf" />
                         ) : <DocumentPlaceholder title="Proces Verbal not available" />}
                    </TabsContent>
                    <TabsContent value="PV Semnat">
                         {selectedDocument.recipient.pvSemnatUrl ? (
                            <DocumentViewer url={selectedDocument.recipient.pvSemnatUrl} docType="pdf" />
                         ) : <DocumentPlaceholder title="PV Semnat (Signed) not available" />}
                    </TabsContent>
                    <TabsContent value="Instructions">
                         {selectedDocument.recipient.instructionsUrl ? (
                            <DocumentViewer url={selectedDocument.recipient.instructionsUrl} docType="gdrive-pdf" />
                         ) : <DocumentPlaceholder title="Instructions not available" />}
                    </TabsContent>
                    <TabsContent value="Inventory">
                        {selectedDocument.recipient.inventoryUrl ? (
                            <DocumentViewer url={selectedDocument.recipient.inventoryUrl} docType="gdrive-excel" />
                         ) : <DocumentPlaceholder title="Parcel inventory not available" />}
                    </TabsContent>
                    <TabsContent value="AWB">
                        {selectedDocument.recipient.awb.awbUrl ? (
                            <DocumentViewer url={selectedDocument.recipient.awb.awbUrl} docType="pdf" />
                        ) : <DocumentPlaceholder title={`AWB not available.`} /> }
                    </TabsContent>
                    <TabsContent value="Email">
                        {selectedDocument.recipient.emailId ? (
                             <div className="mt-4 flex flex-col items-center justify-center gap-4 text-center p-8 border rounded-lg">
                                <h3 className="font-semibold">Email Sent to Logistics</h3>
                                <p className="text-sm text-muted-foreground">
                                    The email for AWB <span className="font-mono">{selectedDocument.recipient.awb?.awbNumber}</span> has been sent.
                                </p>
                                <Button asChild>
                                    <a href={`https://mail.google.com/mail/u/0/#inbox/${selectedDocument.recipient.emailId}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        View in Gmail
                                    </a>
                                 </Button>
                             </div>
                         ) : (
                            <DocumentPlaceholder title={`Email has not been sent for this AWB.`} />
                         )}
                    </TabsContent>
                </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
