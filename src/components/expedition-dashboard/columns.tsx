
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RecipientRow, recipientStatuses, recipientStatusVariant, awbStatuses, awbStatusVariant, docShortNames, DocType } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, FileText, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnFilter } from "./column-filter";
import { DocumentType, RecipientStatus, AWBStatus } from "@/types";
import React from "react";


export const columns = (
    handleOpenDocument: (recipient: RecipientRow, docType: DocType) => void,
    setRowSelection: React.Dispatch<React.SetStateAction<{}>>
): ColumnDef<RecipientRow>[] => [
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
      accessorKey: "awb.mainRecipientTelephone",
      header: "Telephone",
      cell: ({ row }) => <div>{row.original.awb?.mainRecipientTelephone ?? 'N/A'}</div>,
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
            options={awbStatuses.map(s => ({ value: s, label:s}))}
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
            const emailSent = ['Sent to Logistics', 'In Transit', 'Canceled', 'Lost or Damaged'].includes(recipient.expeditionStatus);

            return (
                <div className="flex gap-2">
                    {recipient.pvStatus === 'Generated' && (
                         <Badge
                            variant={"secondary"}
                            className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
                            onClick={() => handleOpenDocument(recipient, 'PV')}
                        >
                            <FileText className="w-3 h-3" />
                            {docShortNames['PV']}
                        </Badge>
                    )}
                    {recipient.instructionsStatus === 'Generated' && (
                         <Badge
                            variant={"secondary"}
                            className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleOpenDocument(recipient, 'Instructions')}
                        >
                            {docShortNames['Instructions']}
                        </Badge>
                    )}
                    {recipient.inventoryStatus === 'Generated' && (
                         <Badge
                            variant={"secondary"}
                            className="cursor-pointer font-normal hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleOpenDocument(recipient, 'Inventory')}
                        >
                            {docShortNames['Inventory']}
                        </Badge>
                    )}
                    {recipient.awbUrl && (
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
