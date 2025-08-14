export type DocumentType = 'proces verbal de receptie' | 'instructiuni pentru confirmarea primirii coletului' | 'parcel inventory';
export type DocumentStatus = 'Not Generated' | 'Generated' | 'Generating...';

export type ExpeditionStatus = 
  | 'New'                       // Initial state
  | 'Documents Generated'       // All preparatory documents are created
  | 'AWB Generated'             // AWB number is assigned
  | 'In Transit'                // On its way
  | 'Delivered'                 // Reached destination, awaiting final confirmation
  | 'Completed'                 // Proces verbal signed and uploaded
  | 'Canceled'                  // Canceled by user
  | 'Returned'                  // Returned to sender
  | 'Lost or Damaged';          // Failed in transit

export interface Document {
    status: DocumentStatus;
    content?: string;
}

export interface Expedition {
  id: string;
  origin: string;
  destination: string;
  items: string[];
  status: ExpeditionStatus;
  awb?: string;
  documents: {
    'proces verbal de receptie': Document;
    'instructiuni pentru confirmarea primirii coletului': Document;
    'parcel inventory': Document;
  };
}
