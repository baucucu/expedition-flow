
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RecipientRow, recipientStatuses, recipientStatusVariant, awbStatuses, awbStatusVariant, docShortNames, DocType } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, FileText, Mail, History, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnFilter } from "./column-filter";
import { DocumentType, RecipientStatus, AWBStatus, ExpeditionStatusInfo } from "@/types";
import React from "react";
import { EditableCell } from "./editable-cell";
import { updateShipmentDetails } from "@/app/actions/expedition-actions";
import { useToast } from "@/hooks/use-toast";


export const columns = (
    handleOpenDocument: (recipient: RecipientRow, docType: DocType) => void,
    setRowSelection: React.Dispatch<React.SetStateAction<{}>>,
    updateData: (rowIndex: number, columnId: string, value: any) => void
): ColumnDef<RecipientRow>[] => {
    const { toast } = useToast();

    const onSave = async (rowIndex: number, columnId: string, value: string, shipmentId: string) => {
        const field = columnId.split('.')[1];
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
                    onClick={(e) => e.stopPropagation()}
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
            accessorKey: "id",
            header: "Document ID",
            cell: ({ row }) => <div className="font-mono text-xs w-28 truncate">{row.getValue("id")}</div>,
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
            cell: ({ row }) => (
                 <div className="w-48 whitespace-normal">
                    <EditableCell
                        value={row.original.awb?.address ?? 'N/A'}
                        onSave={(value) => onSave(row.index, 'awb.address', value, row.original.expeditionId)}
                    />
                </div>
            ),
        },
        {
            accessorKey: "awb.city",
            header: "City",
            cell: ({ row }) => (
                <EditableCell
                    value={row.original.awb?.city ?? 'N/A'}
                    onSave={(value) => onSave(row.index, 'awb.city', value, row.original.expeditionId)}
                />
            ),
        },
        {
            accessorKey: "awb.county",
            header: "County",
            cell: ({ row }) => (
                <EditableCell
                    value={row.original.awb?.county ?? 'N/A'}
                    onSave={(value) => onSave(row.index, 'awb.county', value, row.original.expeditionId)}
                />
            ),
        },
        {
            accessorKey: "telephone",
            header: "Telephone",
            cell: ({ row }) => <div>{row.original.telephone}</div>,
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnFilter
                    column={column}
                    title="Recipient Status"
                    options={recipientStatuses.map(s => ({ value: s, label: s }))}
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
                    options={awbStatuses.map(s => ({ value: s, label: s }))}
                />
            ),
            cell: ({ row }) => {
                const awb = row.original.awb;
                const status: AWBStatus = awb?.status ?? 'New';
                const awbNumber = awb?.awb_data?.awbNumber;
                const expeditionStatusObj = awb?.expeditionStatus;
                const isDelivered = expeditionStatusObj?.status === "Livrata cu succes";

                return (
                    <div className="flex flex-wrap gap-1 items-center">
                        <Badge variant={awbStatusVariant[status] || "outline"} className="capitalize">
                            {status}
                        </Badge>
                        {awbNumber && <Badge variant="secondary">{awbNumber}</Badge>}
                         {isDelivered && (
                            <Badge variant="default" className="font-normal bg-green-600 hover:bg-green-700">
                                {expeditionStatusObj.status}
                            </Badge>
                        )}
                        {expeditionStatusObj?.status && !isDelivered && (
                             <Badge 
                                variant={"secondary"}
                                className="font-normal"
                            >
                                {expeditionStatusObj.status}
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
                    title="Parcel Count"
                    options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                />
            ),
            cell: ({ row }) => {
                const parcelCount = row.original.awb?.parcelCount;
                return <div>{parcelCount ?? 'N/A'}</div>;
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
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'PV'); }}
                            >
                                <FileText className="w-3 h-3" />
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
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'Email'); }}
                            >
                                <Mail className="w-3 h-3" />
                                {docShortNames['Email']}
                            </Badge>
                        )}
                        {hasAwbHistory && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'AWB History'); }}
                            >
                                <History className="w-3 h-3" />
                                {docShortNames['AWB History']}
                            </Badge>
                        )}
                        {hasNotes && (
                            <Badge
                                variant={"secondary"}
                                className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); handleOpenDocument(recipient, 'Notes'); }}
                            >
                                <MessageSquare className="w-3 h-3" />
                                {docShortNames['Notes']}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
    ];
}
