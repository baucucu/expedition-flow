

export type DocumentType = 'proces verbal de receptie' | 'instructiuni pentru confirmarea primirii coletului' | 'parcel inventory' | 'PV';
export type DocumentStatus = 'Not Generated' | 'Generated' | 'Failed';

export type RecipientStatus = 
  | 'New'
  | 'Documents Generated'
  | 'Delivered'
  | 'Completed'
  | 'Returned';

export type ExpeditionStatus = 
  | 'New'
  | 'Ready for AWB'
  | 'AWB Generation Queued'
  | 'AWB Generated'
  | 'AWB Generation Failed'
  | 'Sent to Logistics'
  | 'Email Send Failed'
  | 'In Transit'
  | 'Delivered' 
  | 'Canceled'
  | 'Lost or Damaged'
  | 'Completed';


export interface Document {
    status: DocumentStatus;
    content?: string;
    url?: string;
}

export interface Recipient {
  id: string; // destinatar_id
  shipmentId: string; // id_unic_expeditie
  awbId: string; // The ID of the AWB document this recipient belongs to
  name: string; // Nume și prenume
  address: string;
  status: RecipientStatus;
  documents: {
    'instructiuni pentru confirmarea primirii coletului': Document;
    'parcel inventory': Document;
  };
  pvId?: string; // Google Drive document ID for the Proces Verbal
  pvUrl?: string; // webViewLink for the Google Drive Proces Verbal
  group?: string;
  county?: string;
  city?: string;
  schoolName?: string; // from 'location'
  schoolUniqueName?: string; // from 'COD UNIC'
  email?: string;
  telephone?: string; // from 'phone'
  postalCode?: string;
}

export type AWBStatus = 'New' | 'Queued' | 'Generated' | 'Failed';

export interface AWB {
    id: string; // Firestore auto-generated ID
    shipmentId: string;
    awbNumber?: string; // The number received from the courier API
    mainRecipientName: string; // Nume_awb
    mainRecipientTelephone?: string; // Nr_tel_awb
    parcelCount?: number; // parcel_count
    packageSize?: string; // TIP CUTIE
    status?: AWBStatus;
    error?: string;
}

export interface Expedition {
  id: string; // This is the shipmentId
  status: ExpeditionStatus;
  recipientCount: number;
  awbCount: number;
  createdAt: any; // Firestore serverTimestamp
}
