

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RecipientRow, awbStatuses, awbStatusVariant, docShortNames, DocType } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, FileText, Mail, History, MessageSquare, CheckCircle2, Plane, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnFilter } from "./column-filter";
import { AWBStatus } from "@/types";
import React from "react";
import { updateShipmentDetails } from "@/app/actions/expedition-actions";
import { useToast } from "@/hooks/use-toast";
import { ContactCell } from "./contact-cell";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";


export const columns = (
    handleOpenDocument: (recipient: RecipientRow, docType: DocType) => void,
    setRowSelection: React.Dispatch<React.SetStateAction<{}>>,
): ColumnDef<RecipientRow>[] => {
    const { toast } = useToast();

    const onSave = async (rowIndex: number, field: string, value: string, shipmentId: string) => {
        const res = await updateShipmentDetails(shipmentId, { [field]: value });
        if (res.success) {
            toast({
                title: "Success",
                description: "Shipment details updated successfully.",
            });
            // This will trigger a refetch of the data in the main component
        } else {
            toast({
                title: "Error",
                description: res.message,
                variant: "destructive",
            });
        }
    };

    return [
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
            accessorKey: "numericId",
            header: "Recipient ID",
            cell: ({ row }) => <div>{row.getValue("numericId")}</div>,
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
            cell: ({ row }) => <div className="w-40">{row.original.schoolName}</div>,
        },
        {
            id: 'contact',
            header: 'Contact',
            cell: ({ row }) => (
                <ContactCell 
                    recipient={row.original}
                    onSave={(field, value) => onSave(row.index, field, value, row.original.expeditionId)}
                />
            )
        },
        {
            accessorKey: "awb.status",
            header: ({ column }) => (
                <DataTableColumnFilter
                    column={column}
                    title="AWB Status"
                    options={awbStatuses.map(s => ({ value: s, label: s }))}
                />
            ),
            cell: ({ row }) => {
                const awb = row.original.awb;
                const status: AWBStatus = awb?.status ?? 'New';
                const awbNumber = awb?.awb_data?.awbNumber;
                const expeditionStatusObj = awb?.expeditionStatus;
                const expeditionStatus = expeditionStatusObj?.status;
                
                const getStatusVariant = (status: string | undefined): "green" | "red" | "blue" | "yellow" => {
                    if (!status) return "yellow";
                    if (status === "Livrata cu succes") return "green";
                    if (status === "AWB Emis") return "blue";
                    if (["Avizat", "Ridicare ulterioara"].includes(status)) return "red";
                    return "yellow";
                }

                return (
                    <div className="flex flex-wrap gap-1 items-center">
                        {!awbNumber && <Badge variant={awbStatusVariant[status] || "outline"} className="capitalize">
                            {status}
                        </Badge>}
                        
                        {awbNumber && <Badge variant="blue">{awbNumber}</Badge>}
                         
                        {expeditionStatus && (
                             <Badge 
                                variant={getStatusVariant(expeditionStatus)}
                                className="font-normal flex items-center gap-1"
                            >
                                {expeditionStatus}
                            </Badge>
                        )}
                    </div>
                );
            },
            filterFn: (row, id, value) => {
                const status = row.original.awb?.status ?? 'New';
                return value.includes(status)
            },
        },
        {
            accessorKey: "awb.parcelCount",
            header: ({ column }) => (
                <DataTableColumnFilter
                    column={column}
                    title="Parcels"
                    options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                />
            ),
            cell: ({ row }) => {
                const parcelCount = row.original.awb?.parcelCount;
                return <div className="text-center">{parcelCount ?? 'N/A'}</div>;
            },
            filterFn: (row, id, value) => {
                const parcelCount = row.original.awb?.parcelCount;
                return value.includes(String(parcelCount));
            },
        },
        {
            id: "documents",
            header: "Documents",
            cell: ({ row }) => {
                const recipient = row.original;
                const emailSent = recipient.emailId;
                const hasAwbHistory = recipient.awb?.awbStatusHistory && recipient.awb.awbStatusHistory.length > 0;
                const hasNotes = recipient.awb?.notes && recipient.awb.notes.length > 0;

                return (
                    <div className="flex flex-wrap gap-2">
                        {recipient.pvUrl && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'PV'); }}
                            >
                                {docShortNames['PV']}
                            </Badge>
                        )}
                        {recipient.pvSemnatUrl && (
                             <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'PV Semnat'); }}
                            >
                                {docShortNames['PV Semnat']}
                            </Badge>
                        )}
                        {recipient.instructionsStatus === 'Generated' && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'Instructions'); }}
                            >
                                {docShortNames['Instructions']}
                            </Badge>
                        )}
                        {recipient.inventoryStatus === 'Generated' && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'Inventory'); }}
                            >
                                {docShortNames['Inventory']}
                            </Badge>
                        )}
                        {recipient.awbUrl && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'AWB'); }}
                            >
                                {docShortNames['AWB']}
                            </Badge>
                        )}
                        {emailSent && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'Email'); }}
                            >
                                {docShortNames['Email']}
                            </Badge>
                        )}
                        {hasAwbHistory && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'AWB History'); }}
                            >
                                {docShortNames['AWB History']}
                            </Badge>
                        )}
                        {hasNotes && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'Notes'); }}
                            >
                                {docShortNames['Notes']}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'lastNote',
            header: 'Last Note',
            cell: ({ row }) => {
                const notes = row.original.awb?.notes;
                if (!notes || notes.length === 0) {
                    return null;
                }
                const lastNote = [...notes].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-48 truncate">{lastNote.noteText}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs whitespace-pre-wrap">{lastNote.noteText}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            }
        }
    ];
}
