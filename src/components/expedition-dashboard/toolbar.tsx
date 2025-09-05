
import { Table } from "@tanstack/react-table";
import { RecipientRow } from "./types";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileCheck, Loader2, Send, FileSignature, Hourglass, Mail, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
}: ToolbarProps) {
  const selectedRowCount = Object.keys(table.getState().rowSelection).length;
  const emailFilterText = {
    sent: "Sent",
    not_sent: "Not Sent",
  };

  return (
    <div className="flex flex-col gap-4 mb-4">
        {/* Actions Row */}
        <div className="flex items-center gap-2">
             <Button
                onClick={handleGeneratePvs}
                disabled={isGeneratingPv || selectedRowCount === 0}
                >
                {isGeneratingPv ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <FileSignature className="mr-2 h-4 w-4" />
                )}
                {isGeneratingPv
                    ? "Generating..."
                    : `Generate PV for ${selectedRowCount} selected`}
            </Button>
            <Button
                onClick={handleQueueAwbs}
                disabled={isQueuingAwb || selectedRowCount === 0}
                >
                {isQueuingAwb ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Hourglass className="mr-2 h-4 w-4" />
                )}
                {isQueuingAwb
                    ? "Queuing..."
                    : `Generate AWB(s) for ${selectedRowCount} selected`}
            </Button>
            <Button
                onClick={handleSendEmails}
                disabled={isSendingEmail || selectedRowCount === 0}
                >
                {isSendingEmail ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Send className="mr-2 h-4 w-4" />
                )}
                {isSendingEmail
                    ? "Queuing..."
                    : `Send Email for ${selectedRowCount} selected`}
            </Button>
            <Button
                onClick={handleUpdateAwbStatus}
                disabled={isUpdatingAwbStatus || selectedRowCount === 0}
                >
                {isUpdatingAwbStatus ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isUpdatingAwbStatus
                    ? "Updating..."
                    : `Update AWB Status for ${selectedRowCount} selected`}
            </Button>
            <Button
                onClick={handleSendReminder}
                disabled={isSendingReminder || selectedRowCount === 0}
                >
                {isSendingReminder ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Send className="mr-2 h-4 w-4" />
                )}
                {isSendingReminder
                    ? "Sending..."
                    : `Send Reminder for ${selectedRowCount} selected`}
            </Button>
        </div>
        {/* Filters Row */}
        <div className="flex items-center">
            <Input
                placeholder="Search all columns..."
                value={(table.getState().globalFilter as string) ?? ""}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
                className="max-w-sm"
            />
            <div className="flex items-center gap-2 ml-auto">
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
            </div>
      </div>
    </div>
  );
}
