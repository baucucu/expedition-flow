
export type DocumentType = 'proces verbal de receptie' | 'instructiuni pentru confirmarea primirii coletului' | 'parcel inventory' | 'PV' | 'AWB';
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
    fileId?: string;
    error?: string;
}

export interface Recipient {
  id: string; // destinatar_id
  shipmentId: string; // id_unic_expeditie
  awbId: string; // The ID of the AWB document this recipient belongs to
  name: string; // Nume și prenume
  status: RecipientStatus;
  documents: {
    'proces verbal de receptie': Document;
    'instructiuni pentru confirmarea primirii coletului': Document;
    'parcel inventory': Document;
  };
  pvId?: string; // Google Drive document ID for the Proces Verbal
  pvUrl?: string; // webViewLink for the Google Drive Proces Verbal
  group?: string;
  schoolName?: string; // from 'location'
  schoolUniqueName?: string; // from 'COD UNIC'
  email?: string;
  telephone?: string; // from 'phone'
  awbWebviewUrl?: string;
  awbPdfFileId?: string;
}

export type AWBStatus = 'New' | 'Queued' | 'Generated' | 'Failed' | 'AWB_CREATED';

export interface AWB {
    id: string; // Firestore auto-generated ID
    shipmentId: string;
    awbNumber?: string; // The number received from the courier API
    mainRecipientName: string; // Nume_awb
    mainRecipientTelephone?: string; // Nr_tel_awb
    mainRecipientEmail?: string;
    parcelCount?: number; // parcel_count
    packageSize?: string; // TIP CUTIE
    status: AWBStatus;
    error?: string | null;

    // Address fields moved from Recipient
    address: string;
    city: string;
    county: string;
    postalCode?: string;
}

export interface Expedition {
  id: string; // This is the shipmentId
  status: ExpeditionStatus;
  recipientCount: number;
  awbCount: number;
  createdAt: any; // Firestore serverTimestamp
}
