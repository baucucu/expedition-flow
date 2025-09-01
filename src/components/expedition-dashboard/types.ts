
import type { Recipient, DocumentType, RecipientStatus, Expedition, ExpeditionStatus, AWB, AWBStatus, DocumentStatus } from "@/types";

export const recipientStatusVariant: { [key in RecipientStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  New: "outline",
  "Documents Generated": "secondary",
  Delivered: "default",
  Completed: "default",
  Returned: "destructive",
};

export const recipientStatuses: RecipientStatus[] = ['New', 'Documents Generated', 'Delivered', 'Completed', 'Returned'];

export const awbStatusVariant: { [key in AWBStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  New: "outline",
  Queued: "secondary",
  Generated: "default",
  AWB_CREATED: "default",
  Failed: "destructive",
};

export const awbStatuses: AWBStatus[] = ['New', 'Queued', 'Generated', 'AWB_CREATED', 'Failed'];


export type RecipientRow = Recipient & { 
    expeditionId: string; 
    awb?: AWB, 
    expeditionStatus: ExpeditionStatus,
    awbUrl?: string;
    awbStatus?: DocumentStatus;
};

export interface ExpeditionDashboardProps {
    initialData: RecipientRow[];
    expeditions: Expedition[];
}

export type DocType = DocumentType | 'Email' | 'AWB' | 'PV' | 'Instructions' | 'Inventory';

export const docShortNames: Record<DocType, string> = {
    'proces verbal de receptie': 'PV',
    'instructiuni pentru confirmarea primirii coletului': 'Instructions',
    'parcel inventory': 'Inventory',
    'AWB': 'AWB',
    'Email': 'Email',
    'PV': 'PV',
    'Instructions': 'Instructions',
    'Inventory': 'Inventory'
}

export type SelectedDocument = {
  recipient: RecipientRow;
  docType: DocType;
}
