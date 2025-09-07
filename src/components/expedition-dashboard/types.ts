

import type { Recipient, DocumentType as AppDocumentType, RecipientStatus, Expedition, ExpeditionStatus, AWB, AWBStatus, DocumentStatus, EmailStatus, ExpeditionStatusInfo, Note } from "@/types";

export const recipientStatusVariant: { [key in RecipientStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  New: "outline",
  "Documents Generated": "secondary",
  Delivered: "default",
  Completed: "default",
  Returned: "destructive",
};

export const recipientStatuses: RecipientStatus[] = ['New', 'Documents Generated', 'Delivered', 'Completed', 'Returned'];

export const awbStatuses: AWBStatus[] = ['New', 'Queued', 'Generated', 'AWB_CREATED', 'Failed'];


export type RecipientRow = Recipient & { 
    expeditionId: string; 
    awb?: AWB, 
    expeditionStatus?: ExpeditionStatusInfo | string,
    awbStatusHistory?: ExpeditionStatusInfo[],
    awbUrl?: string;
    awbStatus?: DocumentStatus;
    emailStatus?: EmailStatus;
    emailId?: string;
};

export interface ExpeditionDashboardProps {
    initialData: RecipientRow[];
    expeditions: Expedition[];
    gdprMode: boolean;
    pvFilter: 'all' | 'has_pv' | 'no_pv';
    setPvFilter: (value: 'all' | 'has_pv' | 'no_pv') => void;
    emailFilter: 'all' | 'sent' | 'not_sent';
    setEmailFilter: (value: 'all' | 'sent' | 'not_sent') => void;
}

export type DocType = AppDocumentType | 'Email' | 'AWB' | 'PV' | 'Instructions' | 'Inventory' | 'PV Semnat' | 'History' | 'Notes';

export const docShortNames: Record<DocType, string> = {
    'proces verbal de receptie': 'PV',
    'instructiuni pentru confirmarea primirii coletului': 'Instructions',
    'parcel inventory': 'Inventory',
    'AWB': 'AWB',
    'Email': 'Email',
    'PV': 'PV',
    'Instructions': 'Instructions',
    'Inventory': 'Inventory',
    'PV Semnat': 'PV Semnat',
    'History': 'History',
    'Notes': 'Notes'
}

export type SelectedDocument = {
  recipient: RecipientRow;
  docType: DocType;
}
