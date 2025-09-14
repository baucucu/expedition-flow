

"use client";

import * as React from "react";
import { useRouter } from 'next/navigation';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast";
import { DocumentViewer } from "../document-viewer";
import { sendEmailToLogisticsAction } from "@/app/actions/email-actions";
import { generateProcesVerbalAction } from "@/app/actions/document-actions";
import { queueShipmentAwbGenerationAction, updateAwbStatusAction, addNoteToAwbAction, regenerateAwbAction } from "@/app/actions/awb-actions";
import { sendReminder } from "@/app/actions/reminder-actions";
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
import { ExternalLink, Loader2, Send } from "lucide-react";
import { Note, ExpeditionStatusInfo, AWBStatus } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { format } from 'date-fns';
import { Badge } from "../ui/badge";

const toDate = (timestamp: any): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
   if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  // Return a default invalid date if parsing fails
  return new Date(NaN);
};

// Helper to convert Firestore Timestamps for notes
const formatNoteTimestamp = (timestamp: any): string => {
    if (!timestamp) return '...';
    try {
        const date = toDate(timestamp);
        return format(date, 'PPP p');
    } catch (e) {
        return 'Invalid Date';
    }
};


const formatHistoryTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    if (typeof timestamp === 'string') return timestamp; // Already a string
    if (timestamp && typeof timestamp.seconds === 'number') { // Firestore Timestamp
        return format(new Date(timestamp.seconds * 1000), 'PPP p');
    }
    return 'Invalid Date';
};


export const ExpeditionDashboard: React.FC<ExpeditionDashboardProps> = ({ 
    initialData, 
    expeditions,
    gdprMode,
    pvFilter,
    setPvFilter,
    emailFilter,
    setEmailFilter
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
  const [isUpdatingAwbStatus, setIsUpdatingAwbStatus] = React.useState(false);
  const [isSavingNote, setIsSavingNote] = React.useState(false);
  const [isSendingReminder, setIsSendingReminder] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [newNote, setNewNote] = React.useState("");
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = React.useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = React.useState(false);
  const [recipientsForEmail, setRecipientsForEmail] = React.useState<RecipientRow[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isReadOnly } = useAuth();

  React.useEffect(() => {
    setData(initialData);
    table.resetRowSelection();
  }, [initialData]);
  
  const handleOpenDocument = (recipient: RecipientRow, docType: DocType) => {
    setSelectedDocument({ recipient, docType });
  }

  const awbStatuses = React.useMemo(() => {
    const statuses = new Set<AWBStatus>();
    initialData.forEach(row => {
      const status = row.awb?.status ?? 'New';
      if (status) statuses.add(status);
    });
    return Array.from(statuses);
  }, [initialData]);

  const table = useReactTable({
    data,
    columns: columns(handleOpenDocument, setRowSelection, gdprMode, awbStatuses),
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
            row.original.email,
            row.original.schoolName,
            row.original.status,
            row.original.awb?.status,
            row.original.awb?.mainRecipientName,
            row.original.awb?.mainRecipientEmail,
            row.original.awb?.mainRecipientTelephone,
            row.original.awb?.awb_data?.awbNumber,
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
    initialState: {
      pagination: {
          pageSize: 30,
      },
    },
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
  
    const recipientsWithGeneratedAwb = selectedRecipients.some(
      (r) => r.awb?.status === 'Generated' || r.awb?.status === 'AWB_CREATED'
    );
  
    if (recipientsWithGeneratedAwb) {
        toast({
            variant: 'destructive',
            title: 'Action Not Allowed',
            description: 'One or more selected items already have a generated AWB. Please use the "Regenerate AWB" action instead.',
        });
        return;
    }
  
    setIsQueuingAwb(true);
  
    try {
      let awbsToQueue = selectedRecipients.map(recipient => ({
          shipmentId: recipient.expeditionId,
          awbId: recipient.awbId,
        }));
  
      if (awbsToQueue.length > 0) {
        const result = await queueShipmentAwbGenerationAction({ awbsToQueue: awbsToQueue as any });
        if (result.success) {
          toast({ title: 'AWB Generation Queued', description: result.message });
          table.resetRowSelection();
          router.refresh();
        } else {
          throw new Error(result.message);
        }
      } else {
        toast({ title: 'Nothing to Queue', description: 'No new AWBs were created for queueing.' });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'AWB Operation Failed',
        description: error.message,
      });
    } finally {
      setIsQueuingAwb(false);
    }
  };

  const handleRegenerateAwbs = async () => {
    const selectedRecipients = getSelectedRecipients();
    if (selectedRecipients.length === 0) {
        setIsRegenerateDialogOpen(false);
        return;
    }

    const uniqueAwbIds = [...new Set(selectedRecipients.map(r => r.awbId).filter(Boolean))] as string[];
    if (uniqueAwbIds.length === 0) {
        toast({ variant: 'destructive', title: 'No AWBs to Regenerate', description: 'Could not find AWB IDs in selected rows.' });
        setIsRegenerateDialogOpen(false);
        return;
    }

    setIsRegenerating(true);
    const result = await regenerateAwbAction({ awbIds: uniqueAwbIds });
    setIsRegenerating(false);
    setIsRegenerateDialogOpen(false);

    if (result.success) {
        toast({ title: 'AWB Regeneration Successful', description: result.message });
        table.resetRowSelection();
        router.refresh();
    } else {
        toast({ variant: 'destructive', title: 'AWB Regeneration Failed', description: result.message });
    }
  };


  const handleSendEmails = async (confirmed = false) => {
    const selectedRecipients = getSelectedRecipients();
    if (selectedRecipients.length === 0) return;

    const alreadySentRecipients = selectedRecipients.filter(r => r.awb?.emailSentCount && r.awb.emailSentCount > 0);

    if (alreadySentRecipients.length > 0 && !confirmed) {
        setRecipientsForEmail(selectedRecipients);
        setIsConfirmationDialogOpen(true);
        return;
    }
    
    const processEmails = async (recipients: RecipientRow[]) => {
        // Group recipients by shipment
        const shipmentsMap = new Map<string, RecipientRow[]>();
        recipients.forEach(r => {
            if (!shipmentsMap.has(r.shipmentId)) {
                shipmentsMap.set(r.shipmentId, []);
            }
            shipmentsMap.get(r.shipmentId)!.push(r);
        });

        const emailPayloads = [];

        // Create a payload for each shipment
        for (const [shipmentId, shipmentRecipients] of shipmentsMap.entries()) {
            const firstRecipient = shipmentRecipients[0];
            const awbData = firstRecipient.awb;

            if (!awbData) {
                console.warn(`Skipping shipment ${shipmentId} because it has no AWB data.`);
                continue;
            }

            const payload = {
                shipmentId: shipmentId,
                awbNumber: awbData.awb_data?.awbNumber,
                awbUrl: awbData.awbUrl,
                awbDocumentId: awbData.id,
                awbNumberOfParcels: awbData.parcelCount,
                inventoryDocumentId: firstRecipient.inventoryFileId,
                instructionsDocumentId: firstRecipient.instructionsFileId,
                recipients: shipmentRecipients.map(r => ({
                    recipientId: r.id,
                    numericId: r.numericId,
                    uuid: r.uuid,
                    name: r.name,
                    pvDocumentId: r.pvId || null,
                    pvUrl: r.pvUrl || null,
                })),
                 // This will be added in the trigger task
            };
            emailPayloads.push(payload);
        }
        
        if (emailPayloads.length === 0) {
          toast({ variant: 'destructive', title: 'Nothing to send', description: 'Could not construct valid email payloads for the selected items.' });
          return;
        }

        setIsSendingEmail(true);
        const result = await sendEmailToLogisticsAction({ payloads: emailPayloads });
        setIsSendingEmail(false);
        setIsConfirmationDialogOpen(false);
        setRecipientsForEmail([]);

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

    await processEmails(confirmed ? recipientsForEmail : selectedRecipients);
  }

  const handleUpdateAwbStatus = async () => {
    const selectedRecipients = getSelectedRecipients();
    if (selectedRecipients.length === 0) return;

    const awbIds = selectedRecipients
      .map(r => r.awbId)
      .filter((id): id is string => !!id);

    if (awbIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No AWBs to Update",
        description: "None of the selected recipients have an AWB.",
      });
      return;
    }

    setIsUpdatingAwbStatus(true);
    const result = await updateAwbStatusAction({ awbIds });
    setIsUpdatingAwbStatus(false);

    if (result.success) {
      toast({
        title: "AWB Status Update Queued",
        description: result.message,
      });
      table.resetRowSelection();
    } else {
      toast({
        variant: "destructive",
        title: "Failed to Queue AWB Status Update",
        description: result.message,
      });
    }
  };
  
  const handleSaveNote = async () => {
    if (!selectedDocument || !user || !newNote.trim()) return;

    setIsSavingNote(true);
    
    const noteData = {
        awbId: selectedDocument.recipient.awbId,
        noteText: newNote,
        userId: user.uid,
        userName: user.email || 'Unknown User',
        recipientId: selectedDocument.recipient.id,
        recipientName: selectedDocument.recipient.name,
        createdAt: new Date(),
    };

    const result = await addNoteToAwbAction(noteData);
    setIsSavingNote(false);

    if (result.success) {
        toast({ title: 'Note Saved', description: result.message });
        setNewNote("");
    } else {
        toast({ variant: 'destructive', title: 'Failed to Save Note', description: result.message });
    }
  }
  
  const handleSendReminder = async () => {
    const selectedRecipients = getSelectedRecipients();
    if (selectedRecipients.length === 0) return;
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Authenticated",
            description: "You must be logged in to send reminders.",
        });
        return;
    }

    const recipientsToProcess = selectedRecipients.filter(r => r.email && r.id && r.awbId && r.schoolName && r.awb?.mainRecipientName);

    if (recipientsToProcess.length === 0) {
        toast({
            variant: "destructive",
            title: "No valid recipients to process",
            description: "Selected recipients must have an email, ID, AWB ID, location and AWB main recipient name.",
        });
        return;
    }

    setIsSendingReminder(true);
    const result = await sendReminder({
        recipients: recipientsToProcess.map(r => ({
            instructionsDocumentId: r.instructionsFileId!,
            pvUrl: r.pvUrl!,
            recipientEmail: r.email!,
            awbId: r.awbId!,
            recipientName: r.name,
            recipientId: r.id,
            location: r.schoolName!,
            awbMainRecipientName: r.awb!.mainRecipientName,
        })),
        user: {
            id: user.uid,
            name: user.email || "Unknown User",
        },
    });
    setIsSendingReminder(false);

    if (result.success) {
        toast({
            title: "Reminders Sent & Notes Created",
            description: result.message,
        });
        table.resetRowSelection();
        router.refresh(); // Refresh data to show new notes
    } else {
        toast({
            variant: "destructive",
            title: "Operation Failed",
            description: result.message,
        });
    }
};

  
  const displayedRecipient = React.useMemo(() => {
    if (!selectedDocument) return null;
    // Find the latest version of the recipient in the live data
    const updatedRecipient = data.find(d => d.id === selectedDocument.recipient.id);
    if (updatedRecipient) {
        // Find the latest AWB data for this recipient
        const updatedAwb = data.find(d => d.awbId === updatedRecipient.awbId)?.awb;
        return {
            ...updatedRecipient,
            awb: updatedAwb || updatedRecipient.awb,
        };
    }
    return selectedDocument.recipient;
}, [selectedDocument, data]);


  const awbStatusHistory: ExpeditionStatusInfo[] = React.useMemo(() => {
    if (displayedRecipient?.awb?.awbStatusHistory) {
        try {
            const history = typeof displayedRecipient.awb.awbStatusHistory === 'string'
                ? JSON.parse(displayedRecipient.awb.awbStatusHistory)
                : displayedRecipient.awb.awbStatusHistory;
            if (Array.isArray(history)) {
                return history;
            }
        } catch (error) {
            console.error("Failed to parse awbStatusHistory:", error);
            return [];
        }
    }
    return [];
  }, [displayedRecipient]);

  const awbNotes = React.useMemo(() => {
    if (!displayedRecipient?.awb?.notes) return [];
    
    return [...displayedRecipient.awb.notes].sort((a, b) => {
        return toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime();
    });
}, [displayedRecipient]);


  return (
    <div className="w-full">
        <Toolbar 
            table={table}
            pvFilter={pvFilter}
            setPvFilter={setPvFilter}
            emailFilter={emailFilter}
            setEmailFilter={setEmailFilter}
            isSendingEmail={isSendingEmail}
            handleSendEmails={() => handleSendEmails(false)}
            isGeneratingPv={isGeneratingPv}
            handleGeneratePvs={handleGeneratePvs}
            isQueuingAwb={isQueuingAwb}
            handleQueueAwbs={handleQueueAwbs}
            isUpdatingAwbStatus={isUpdatingAwbStatus}
            handleUpdateAwbStatus={handleUpdateAwbStatus}
            isSendingReminder={isSendingReminder}
            handleSendReminder={handleSendReminder}
            isRegenerating={isRegenerating}
            handleRegenerateAwbs={() => setIsRegenerateDialogOpen(true)}
        />
      <DataTable table={table} />
      <Pagination table={table} />
       <AlertDialog open={isRegenerateDialogOpen} onOpenChange={setIsRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm AWB Regeneration</AlertDialogTitle>
            <AlertDialogDescription>
              This will create new, cloned shipment and recipient records to preserve history before generating a new AWB. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateAwbs}>
                {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm & Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Resend</AlertDialogTitle>
                    <AlertDialogDescription>
                        Some of the selected shipments have already been sent to logistics. Are you sure you want to send them again?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                        setIsConfirmationDialogOpen(false);
                        setRecipientsForEmail([]);
                    }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleSendEmails(true)}>
                        Send Again
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      <Sheet open={!!selectedDocument} onOpenChange={(isOpen) => !isOpen && setSelectedDocument(null)}>
        <SheetContent className="sm:max-w-[80vw]">
          {displayedRecipient && (
            <>
                <SheetHeader>
                    <SheetTitle>Documents for Recipient: {displayedRecipient.name} ({displayedRecipient.numericId})</SheetTitle>
                    <SheetDescription>
                        Part of shipment {displayedRecipient.expeditionId} with AWB: {displayedRecipient.awb?.mainRecipientName || 'N/A'}.
                    </SheetDescription>
                </SheetHeader>
                <Tabs defaultValue={selectedDocument?.docType} className="py-4">
                    <TabsList>
                        <TabsTrigger value="PV" disabled={!displayedRecipient.pvUrl}>Proces Verbal (PV)</TabsTrigger>
                        <TabsTrigger value="PV Semnat" disabled={!displayedRecipient.pvSemnatUrl}>PV Semnat</TabsTrigger>
                        <TabsTrigger value="Instructions" disabled={displayedRecipient.instructionsStatus !== 'Generated'}>Instructions</TabsTrigger>
                        <TabsTrigger value="Inventory" disabled={displayedRecipient.inventoryStatus !== 'Generated'}>Inventory</TabsTrigger>
                        <TabsTrigger value="AWB" disabled={!displayedRecipient.awbUrl}>AWB</TabsTrigger>
                        <TabsTrigger value="Email" disabled={!displayedRecipient.emailId}>Email</TabsTrigger>
                        <TabsTrigger value="History" disabled={!awbStatusHistory || awbStatusHistory.length === 0}>History</TabsTrigger>
                        <TabsTrigger value="Notes">Notes</TabsTrigger>
                    </TabsList>
                    <TabsContent value="PV">
                         {displayedRecipient.pvUrl ? (
                            <DocumentViewer url={displayedRecipient.pvUrl} docType="pdf" />
                         ) : <DocumentPlaceholder title="Proces Verbal not available" />}
                    </TabsContent>
                    <TabsContent value="PV Semnat">
                         {displayedRecipient.pvSemnatUrl ? (
                            <DocumentViewer 
                                url={displayedRecipient.pvSemnatUrl} 
                                docType="image"
                                recipientDocId={displayedRecipient.id} 
                            />
                         ) : <DocumentPlaceholder title="PV Semnat (Signed) not available" />}
                    </TabsContent>
                    <TabsContent value="Instructions">
                         {displayedRecipient.instructionsUrl ? (
                            <DocumentViewer url={displayedRecipient.instructionsUrl} docType="gdrive-pdf" />
                         ) : <DocumentPlaceholder title="Instructions not available" />}
                    </TabsContent>
                    <TabsContent value="Inventory">
                        {displayedRecipient.inventoryUrl ? (
                            <DocumentViewer url={displayedRecipient.inventoryUrl} docType="gdrive-excel" />
                         ) : <DocumentPlaceholder title="Parcel inventory not available" />}
                    </TabsContent>
                    <TabsContent value="AWB">
                        {displayedRecipient.awb?.awbUrl ? (
                            <DocumentViewer url={displayedRecipient.awb?.awbUrl} docType="pdf" />
                        ) : <DocumentPlaceholder title={`AWB not available.`} /> }
                    </TabsContent>
                    <TabsContent value="Email">
                        {displayedRecipient.emailId ? (
                             <div className="mt-4 flex flex-col items-center justify-center gap-4 text-center p-8 border rounded-lg">
                                <h3 className="font-semibold">Email Sent to Logistics</h3>
                                <p className="text-sm text-muted-foreground">
                                    The email for AWB <span className="font-mono">{displayedRecipient.awb?.awb_data?.awbNumber}</span> has been sent.
                                </p>
                                <Button asChild>
                                    <a href={`https://mail.google.com/mail/u/0/#inbox/${displayedRecipient.emailId}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        View in Gmail
                                    </a>
                                 </Button>
                             </div>
                         ) : (
                            <DocumentPlaceholder title={`Email has not been sent for this AWB.`} />
                         )}
                    </TabsContent>
                     <TabsContent value="History">
                        {awbStatusHistory.length > 0 ? (
                            <ScrollArea className="h-[calc(100vh-10rem)] pr-4">
                                <div className="flex flex-col gap-4 py-4">
                                    {awbStatusHistory.map((historyItem, index) => (
                                        <div key={index} className="p-4 border rounded-lg bg-muted/50 text-sm">
                                            <p><strong>Date:</strong> {formatHistoryTimestamp(historyItem.statusDate)}</p>
                                            <p><strong>Status:</strong> {historyItem.status}</p>
                                            <p><strong>Status Label:</strong> {historyItem.statusLabel}</p>
                                            <p><strong>Status State:</strong> {historyItem.statusState}</p>
                                            <p><strong>County:</strong> {historyItem.county}</p>
                                            <p><strong>Transit Location:</strong> {historyItem.transitLocation}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : <DocumentPlaceholder title="AWB History not available" />}
                    </TabsContent>
                     <TabsContent value="Notes" className="h-[calc(100vh-10rem)]">
                         <div className="flex flex-col h-full mt-4">
                            <ScrollArea className="flex-grow pr-4">
                                <div className="space-y-4">
                                    {awbNotes.length > 0 ? (
                                        awbNotes.map((note: Note) => (
                                            <div key={note.id} className="p-3 border rounded-lg bg-muted/50">
                                                <p className="text-sm whitespace-pre-wrap">{note.noteText}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <Badge variant="secondary" className="font-normal">{note.recipientName}</Badge>
                                                    <p className="text-xs text-muted-foreground">
                                                        By: {note.userName} on {formatNoteTimestamp(note.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">
                                            <p>No notes for this AWB yet.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="mt-auto pt-4 border-t">
                                <div className="space-y-2">
                                    <Textarea 
                                        placeholder={`Add a note for ${displayedRecipient.name}...`}
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        disabled={isSavingNote}
                                    />
                                    <Button onClick={handleSaveNote} disabled={isSavingNote || !newNote.trim()} className="w-full">
                                        {isSavingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Save Note
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

    

    

    
