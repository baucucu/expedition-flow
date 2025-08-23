


export type DocumentType = 'proces verbal de receptie' | 'instructiuni pentru confirmarea primirii coletului' | 'parcel inventory';
export type DocumentStatus = 'Not Generated' | 'Generating...' | 'Generated' | 'Failed';

export type RecipientStatus = 
  | 'New'
  | 'Documents Generated'
  | 'Delivered'
  | 'Completed'
  | 'Returned';

export type ExpeditionStatus = 
  | 'New'
  | 'Ready for Logistics'
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
  // items: string[]; // This might not be in the new file, handle gracefully
  status: RecipientStatus;
  documents: {
    'proces verbal de receptie': Document;
    'instructiuni pentru confirmarea primirii coletului': Document;
    'parcel inventory': Document;
  };
  group?: string;
  county?: string;
  city?: string;
  schoolName?: string; // from 'location'
  schoolUniqueName?: string; // from 'COD UNIC'
  email?: string;
  telephone?: string; // from 'phone'
  postalCode?: string;
}

export interface AWB {
    id: string; // Firestore auto-generated ID
    shipmentId: string;
    mainRecipientName: string; // Nume_awb
    mainRecipientTelephone?: string; // Nr_tel_awb
    parcelCount?: number; // parcel_count
    packageSize?: string; // TIP CUTIE
    // We no longer store recipientIds here, the link is on the recipient document
}

export interface Expedition {
  id: string; // This is the shipmentId
  status: ExpeditionStatus;
  recipientCount: number;
  awbCount: number;
  createdAt: any; // Firestore serverTimestamp
  // These are no longer stored directly, they are queried
  // recipients: Recipient[];
  // awbs: AWB[];
}
