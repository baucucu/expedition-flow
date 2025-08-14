export type DocumentType = 'proces verbal de receptie' | 'instructiuni pentru confirmarea primirii coletului' | 'parcel inventory';
export type DocumentStatus = 'Not Generated' | 'Generated' | 'Generating...';
export type ExpeditionStatus = 'Pending' | 'AWB Generated' | 'In Transit' | 'Delivered' | 'Completed';

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
