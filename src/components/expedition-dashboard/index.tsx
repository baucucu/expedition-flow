

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast";
import { DocumentViewer } from "../document-viewer";
import { sendEmailToLogisticsAction } from "@/app/actions/email-actions";
import { generateProcesVerbalAction } from "@/app/actions/document-actions";
import { queueShipmentAwbGenerationAction, updateAwbStatusAction, addNoteToAwbAction } from "@/app/actions/awb-actions";
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
import { Note, ExpeditionStatusInfo } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { format } from 'date-fns';

// Helper to convert Firestore Timestamps for notes
const formatNoteTimestamp = (timestamp: any): string => {
    if (!timestamp) return '...';
    // It's a firestore timestamp
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
        return format(new Date(timestamp.seconds * 1000), 'PPP p');
    }
     // It's already a Date object or a parsable string
    if (timestamp instanceof Date || typeof timestamp === 'string' || typeof timestamp === 'number') {
        try {
            return format(new Date(timestamp), 'PPP p');
        } catch (e) {
            // If parsing fails, return the original value
            return String(timestamp);
        }
    }
    // Fallback for any other unexpected format
    return String(timestamp);
};


const formatHistoryTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    // It's a firestore timestamp
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
        return format(new Date(timestamp.seconds * 1000), 'PPP p');
    }
     // It's already a Date object or a parsable string
    if (timestamp instanceof Date || typeof timestamp === 'string' || typeof timestamp === 'number') {
        try {
            return format(new Date(timestamp), 'PPP p');
        } catch (e) {
            // If parsing fails, return the original value
            return String(timestamp);
        }
    }
    // Fallback for any other unexpected format
    return String(timestamp);
}


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
  const [newNote, setNewNote] = React.useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  React.useEffect(() => {
    setData(initialData);
    table.resetRowSelection();
  }, [initialData]);
  
  const handleOpenDocument = (recipient: RecipientRow, docType: DocType) => {
    setSelectedDocument({ recipient, docType });
  }

  const table = useReactTable({
    data,
    columns: columns(handleOpenDocument, setRowSelection, gdprMode),
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

    const selectedIds = new Set(recipientsToProcess.map(r => r.id));
    setData(prevData =>
      prevData.map(row =>
        selectedIds.has(row.id) ? { ...row, pvStatus: 'Queued' } : row
      )
    );

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
        return status !== 'Generated' && status !== 'AWB_CREATED';
      })
      .map(recipient => ({
          shipmentId: recipient.expeditionId,
          awbId: recipient.awbId
      }));

    if (awbsToProcess.length === 0) {
        toast({
            title: "Nothing to Queue",
            description: "All selected recipients already have a generated AWB.",
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
        createdAt: new Date().toISOString(),
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

    const recipientsToProcess = selectedRecipients.filter(r => r.email && r.id && r.awbId);

    if (recipientsToProcess.length === 0) {
        toast({
            variant: "destructive",
            title: "No valid recipients to process",
            description: "Selected recipients must have an email, ID, and AWB ID.",
        });
        return;
    }

    setIsSendingReminder(true);
    const result = await sendReminder({
        recipients: recipientsToProcess.map(r => ({
            documentId: r.id,
            recipientEmail: r.email!,
            awbId: r.awbId!,
            recipientName: r.name,
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
    return data.find(d => d.id === selectedDocument.recipient.id) || selectedDocument.recipient;
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
            const dateA = a.createdAt ? new Date(formatNoteTimestamp(a.createdAt)).getTime() : 0;
            const dateB = b.createdAt ? new Date(formatNoteTimestamp(b.createdAt)).getTime() : 0;
            return dateB - dateA;
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
            handleSendEmails={handleSendEmails}
            isGeneratingPv={isGeneratingPv}
            handleGeneratePvs={handleGeneratePvs}
            isQueuingAwb={isQueuingAwb}
            handleQueueAwbs={handleQueueAwbs}
            isUpdatingAwbStatus={isUpdatingAwbStatus}
            handleUpdateAwbStatus={handleUpdateAwbStatus}
            isSendingReminder={isSendingReminder}
            handleSendReminder={handleSendReminder}
        />
      <DataTable table={table} />
      <Pagination table={table} />

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
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    By: {note.userName} for {note.recipientName} on {formatNoteTimestamp(note.createdAt)}
                                                </p>
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
