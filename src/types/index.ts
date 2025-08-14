
export type DocumentType = 'proces verbal de receptie' | 'instructiuni pentru confirmarea primirii coletului' | 'parcel inventory';
export type DocumentStatus = 'Not Generated' | 'Generated' | 'Generating...';

export type RecipientStatus = 
  | 'New'                       // Recipient added, no documents yet
  | 'Documents Generated'       // All documents for this recipient are created
  | 'Delivered'                 // Confirmed delivery to this recipient
  | 'Completed'                 // Proces verbal for this recipient is signed and uploaded
  | 'Returned';                 // This part of the shipment was returned

export type ExpeditionStatus = 
  | 'New'                       // Expedition created, recipients being added
  | 'Ready for Logistics'       // All recipients have documents generated
  | 'AWB Generated'             // AWB number is assigned
  | 'Sent to Logistics'         // Email with documents sent to logistics partner
  | 'In Transit'                // On its way
  | 'Canceled'                  // Canceled by user
  | 'Lost or Damaged';          // Failed in transit


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
}

export interface Expedition {
  id: string;
  origin: string;
  status: ExpeditionStatus;
  recipients: Recipient[];
  awb?: string;
}
