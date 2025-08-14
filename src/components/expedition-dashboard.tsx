"use client";

import * as React from "react";
import {
  CaretSortIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
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
  ArrowUpDown,
  FileText,
  Mail,
  MoreHorizontal,
  PlusCircle,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockExpeditions } from "@/lib/data";
import type { Expedition, ExpeditionStatus } from "@/types";
import { DocumentAssistant } from "./document-assistant";
import { EmailComposer } from "./email-composer";
import { useToast } from "@/hooks/use-toast";

const statusVariant: { [key in ExpeditionStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  Pending: "outline",
  "AWB Generated": "secondary",
  "In Transit": "default",
  Delivered: "default",
  Completed: "default",
};

export const ExpeditionDashboard: React.FC = () => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<Expedition[]>(mockExpeditions);

  const [isDocumentAssistantOpen, setDocumentAssistantOpen] = React.useState(false);
  const [isEmailComposerOpen, setEmailComposerOpen] = React.useState(false);
  const [selectedExpedition, setSelectedExpedition] = React.useState<Expedition | null>(null);

  const { toast } = useToast();

  const handleGenerateAWB = (expeditionId: string) => {
    setData((prevData) =>
      prevData.map((exp) =>
        exp.id === expeditionId
          ? {
              ...exp,
              awb: `AWB${Math.floor(100000 + Math.random() * 900000)}`,
              status: "AWB Generated",
            }
          : exp
      )
    );
    toast({
      title: "AWB Generated",
      description: `A new AWB has been generated for expedition ${expeditionId}.`,
    });
  };

  const handleManageDocuments = (expedition: Expedition) => {
    setSelectedExpedition(expedition);
    setDocumentAssistantOpen(true);
  };
  
  const handlePrepareEmail = (expedition: Expedition) => {
    setSelectedExpedition(expedition);
    setEmailComposerOpen(true);
  };

  const updateExpeditionDocument = (expeditionId: string, documentType: keyof Expedition['documents'], content: string) => {
    setData(prevData => prevData.map(exp => {
      if (exp.id === expeditionId) {
        const newDocuments = { ...exp.documents };
        newDocuments[documentType] = { ...newDocuments[documentType], status: 'Generated' as const, content };
        return { ...exp, documents: newDocuments };
      }
      return exp;
    }));
  };

  const columns: ColumnDef<Expedition>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="lowercase">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "origin",
      header: "Origin",
      cell: ({ row }) => <div>{row.getValue("origin")}</div>,
    },
    {
      accessorKey: "destination",
      header: "Destination",
      cell: ({ row }) => <div>{row.getValue("destination")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status: ExpeditionStatus = row.getValue("status");
        return (
          <Badge variant={statusVariant[status] || "default"} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
        accessorKey: "awb",
        header: "AWB",
        cell: ({ row }) => row.getValue("awb") ? <div>{row.getValue("awb")}</div> : <span className="text-muted-foreground">N/A</span>,
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const expedition = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleGenerateAWB(expedition.id)} disabled={!!expedition.awb}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Generate AWB
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleManageDocuments(expedition)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Manage Documents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handlePrepareEmail(expedition)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Prepare Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by destination..."
          value={(table.getColumn("destination")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("destination")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
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
      {selectedExpedition && (
        <>
          <DocumentAssistant
            isOpen={isDocumentAssistantOpen}
            setIsOpen={setDocumentAssistantOpen}
            expedition={selectedExpedition}
            onDocumentGenerated={updateExpeditionDocument}
          />
          <EmailComposer
            isOpen={isEmailComposerOpen}
            setIsOpen={setEmailComposerOpen}
            expedition={selectedExpedition}
          />
        </>
      )}
    </div>
  );
};
