
import type { Expedition, Recipient } from "@/types";

const recipient1A: Recipient = {
  id: "REC-001A",
  name: "Mihai Eminescu",
  address: "Cluj-Napoca, RO",
  items: ["Laptop", "Charger", "Mouse"],
  status: "Documents Generated",
  documents: {
      "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
      "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
      "parcel inventory": { status: "Generated", url: "#", content: "..." },
  },
};

const recipient1B: Recipient = {
  id: "REC-001B",
  name: "Ion Creanga",
  address: "Timisoara, RO",
  items: ["Books (Box of 20)", "Reading light"],
  status: "New",
  documents: {
      "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
      "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
      "parcel inventory": { status: "Failed" },
  },
};

const recipient2A: Recipient = {
  id: "REC-002A",
  name: "Lucian Blaga",
  address: "Oradea, RO",
  items: ["Office Chair", "Desk Mat"],
  status: "Delivered",
  documents: {
      "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
      "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
      "parcel inventory": { status: "Generated", url: "#", content: "..." },
  },
};

const recipient3A: Recipient = {
  id: "REC-003A",
  name: "George Bacovia",
  address: "Brasov, RO",
  items: ["Mechanical Keyboard", "Monitor Stand"],
  status: "New",
  documents: {
      "proces verbal de receptie": { status: "Not Generated" },
      "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
      "parcel inventory": { status: "Not Generated" },
  },
};

const recipient4A: Recipient = {
    id: "REC-004A",
    name: "Vasile Alecsandri",
    address: "Iasi, RO",
    items: ["Monitor", "Webcam"],
    status: "Completed",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
};


export const mockExpeditions: Expedition[] = [
  {
    id: "EXP-C-001",
    origin: "Bucharest, RO",
    destination: "Domestic",
    status: "Ready for Logistics",
    awb: "AWB-MULTI-123",
    recipients: [recipient1A, recipient1B]
  },
  {
    id: "EXP-S-002",
    origin: "Constanta, RO",
    destination: "Oradea, RO",
    status: "In Transit",
    awb: "AWB-SINGLE-456",
    recipients: [recipient2A]
  },
  {
    id: "EXP-S-003",
    origin: "Craiova, RO",
    destination: "Brasov, RO",
    status: "New",
    awb: undefined,
    recipients: [recipient3A]
  },
  {
    id: "EXP-F-004",
    origin: "Sibiu, RO",
    destination: "Iasi, RO",
    status: "AWB Generation Failed",
    awb: undefined,
    recipients: [recipient4A]
  },
];
