

import { Table } from "@tanstack/react-table";
import { RecipientRow } from "./types";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { FileCheck, Loader2, Send, FileSignature, Hourglass, Mail, RefreshCw, CopyPlus, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

interface ToolbarProps {
  table: Table<RecipientRow>;
  pvFilter: "all" | "has_pv" | "no_pv";
  setPvFilter: (value: "all" | "has_pv" | "no_pv") => void;
  emailFilter: "all" | "sent" | "not_sent";
  setEmailFilter: (value: "all" | "sent" | "not_sent") => void;
  isSendingEmail: boolean;
  handleSendEmails: () => void;
  isGeneratingPv: boolean;
  handleGeneratePvs: () => void;
  isQueuingAwb: boolean;
  handleQueueAwbs: () => void;
  isUpdatingAwbStatus: boolean;
  handleUpdateAwbStatus: () => void;
  isSendingReminder: boolean;
  handleSendReminder: () => void;
  isRegenerating: boolean;
  handleRegenerateAwbs: () => void;
}

export function Toolbar({
  table,
  pvFilter,
  setPvFilter,
  emailFilter,
  setEmailFilter,
  isSendingEmail,
  handleSendEmails,
  isGeneratingPv,
  handleGeneratePvs,
  isQueuingAwb,
  handleQueueAwbs,
  isUpdatingAwbStatus,
  handleUpdateAwbStatus,
  isSendingReminder,
  handleSendReminder,
  isRegenerating,
  handleRegenerateAwbs,
}: ToolbarProps) {
  const selectedRowCount = Object.keys(table.getState().rowSelection).length;
  const { isReadOnly, isAuditor } = useAuth();
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmActionLabel, setConfirmActionLabel] = useState("");

  const emailFilterText = {
    sent: "Sent",
    not_sent: "Not Sent",
  };

  const handleActionClick = (action: () => void, label: string) => {
    setConfirmAction(() => action);
    setConfirmActionLabel(label);
    setIsConfirmOpen(true);
  };

  return (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <Input
                placeholder="Search all columns..."
                value={(table.getState().globalFilter as string) ?? ""}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
                className="max-w-sm"
            />
            {!isReadOnly && !isAuditor && (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                            Actions <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                onClick={() => handleActionClick(handleGeneratePvs, "Generate PV")}
                                disabled={isGeneratingPv || selectedRowCount === 0}
                            >
                                <FileSignature className="mr-2 h-4 w-4" />
                                <span>Generate PV</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleActionClick(handleQueueAwbs, "Generate AWB")}
                                disabled={isQueuingAwb || selectedRowCount === 0}
                            >
                                <Hourglass className="mr-2 h-4 w-4" />
                                <span>Generate AWB</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleActionClick(handleRegenerateAwbs, "Regenerate Shipment")}
                                disabled={isRegenerating || selectedRowCount === 0}
                            >
                                <CopyPlus className="mr-2 h-4 w-4" />
                                <span>Regenerate Shipment</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleActionClick(handleSendEmails, "Send to Logistics")}
                                disabled={isSendingEmail || selectedRowCount === 0}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                <span>Send to Logistics</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleActionClick(handleUpdateAwbStatus, "Update AWB Status")}
                                disabled={isUpdatingAwbStatus || selectedRowCount === 0}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                <span>Update AWB Status</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleActionClick(handleSendReminder, "Send Reminder")}
                                disabled={isSendingReminder || selectedRowCount === 0}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                <span>Send Reminder</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {selectedRowCount > 0 && (
                        <Badge variant="secondary" className="rounded-sm px-2 font-normal">
                            {selectedRowCount} selected
                        </Badge>
                    )}

                    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will perform the action "{confirmActionLabel}" for {selectedRowCount} selected items.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                if (confirmAction) {
                                    confirmAction();
                                }
                                setIsConfirmOpen(false);
                                }}
                            >
                                Confirm
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </div>

        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-dashed flex items-center"
                    >
                    <FileCheck className="mr-2 h-4 w-4" />
                    PV Status
                    {pvFilter !== "all" && (
                        <>
                        <Separator orientation="vertical" className="mx-2 h-4" />
                        <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                        >
                            {pvFilter === "has_pv" ? "Has PV" : "No PV"}
                        </Badge>
                        </>
                    )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by PV Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                    value={pvFilter}
                    onValueChange={(value) =>
                        setPvFilter(value as "all" | "has_pv" | "no_pv")
                    }
                    >
                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="has_pv">Has PV</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="no_pv">No PV</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-dashed flex items-center"
                    >
                    <Mail className="mr-2 h-4 w-4" />
                    Email Status
                    {emailFilter !== "all" && (
                        <>
                        <Separator orientation="vertical" className="mx-2 h-4" />
                        <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                        >
                            {emailFilterText[emailFilter]}
                        </Badge>
                        </>
                    )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by Email Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                    value={emailFilter}
                    onValueChange={(value) =>
                        setEmailFilter(value as "all" | "sent" | "not_sent")
                    }
                    >
                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="sent">Sent</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="not_sent">Not Sent</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Top Pagination */}
            <div className="flex items-center space-x-2">
                <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                        table.setPageSize(Number(value))
                    }}
                >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={table.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
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
    </div>
  );
}
