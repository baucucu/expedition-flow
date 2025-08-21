

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
  | 'Delivered' // Note: This could be an aggregate status. A recipient-level status might be more accurate.
  | 'Canceled'
  | 'Lost or Damaged'
  | 'Completed'; // Final state for the whole expedition


export interface Document {
    status: DocumentStatus;
    content?: string;
    url?: string;
}

export interface Recipient {
  id: string;
  name: string;
  address: string;
  items: string[];
  status: RecipientStatus;
  documents: {
    'proces verbal de receptie': Document;
    'instructiuni pentru confirmarea primirii coletului': Document;
    'parcel inventory': Document;
  };
  // New optional fields
  group?: string;
  county?: string;
  city?: string;
  schoolName?: string;
  schoolUniqueName?: string;
  shipmentId?: string;
  boxType?: string;
  email?: string;
  telephone?: string;
}

export interface Expedition {
  id: string;
  origin: string;
  destination: string;
  status: ExpeditionStatus;
  recipients: Recipient[];
  awb?: string;
}
