
"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { FileText, Mail, MoreHorizontal, PlusCircle, Send } from "lucide-react";
import type { Expedition } from "@/types";

interface ExpeditionActionsProps {
    expedition: Expedition;
    onGenerateAWB: (id: string) => void;
    onManageDocuments: (expedition: Expedition) => void;
    onPrepareEmail: (expedition: Expedition) => void;
}

export const ExpeditionActions: React.FC<ExpeditionActionsProps> = ({ 
    expedition, 
    onGenerateAWB,
    onManageDocuments,
    onPrepareEmail
}) => {
    const allDocsGenerated = expedition.status === 'Ready for Logistics';
    const awbGenerated = !!expedition.awb;
    const canSendEmail = awbGenerated;

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
            <DropdownMenuItem onClick={() => onManageDocuments(expedition)}>
                <FileText className="mr-2 h-4 w-4" />
                Manage Documents
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateAWB(expedition.id)} disabled={!allDocsGenerated || awbGenerated}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Generate AWB
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onPrepareEmail(expedition)} disabled={!canSendEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Prepare Email to Logistics
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
