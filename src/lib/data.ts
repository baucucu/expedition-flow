
import type { Expedition } from "@/types";

export const mockExpeditions: Expedition[] = [
  {
    id: "EXP-001",
    origin: "Bucharest, RO",
    destination: "Cluj-Napoca, RO",
    items: ["Laptop", "Charger", "Mouse"],
    status: "New",
    documents: {
      "proces verbal de receptie": { status: "Not Generated" },
      "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
      "parcel inventory": { status: "Not Generated" },
    },
  },
  {
    id: "EXP-002",
    origin: "Iasi, RO",
    destination: "Timisoara, RO",
    items: ["Books (Box of 20)", "Reading light"],
    status: "AWB Generated",
    awb: "AWB123456789",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "..." },
        "parcel inventory": { status: "Generated", content: "..." },
    },
  },
  {
    id: "EXP-003",
    origin: "Constanta, RO",
    destination: "Oradea, RO",
    items: ["Office Chair", "Desk Mat"],
    status: "In Transit",
    awb: "AWB987654321",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "..." },
        "parcel inventory": { status: "Generated", content: "..." },
    },
  },
    {
    id: "EXP-004",
    origin: "Craiova, RO",
    destination: "Brasov, RO",
    items: ["Mechanical Keyboard", "Monitor Stand"],
    status: "Documents Generated",
    documents: {
      "proces verbal de receptie": { status: "Generated", content: "Content for proces verbal..." },
      "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "Content for instructions..." },
      "parcel inventory": { status: "Generated", content: "Content for inventory..." },
    },
  },
  {
    id: "EXP-005",
    origin: "Sibiu, RO",
    destination: "Bucharest, RO",
    items: ["Corporate Documents (File)"],
    status: "Delivered",
    awb: "AWB555555555",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "..." },
        "parcel inventory": { status: "Generated", content: "..." },
    },
  },
  {
    id: "EXP-006",
    origin: "Galati, RO",
    destination: "Ploiesti, RO",
    items: ["Smartphone", "Case"],
    status: "Completed",
    awb: "AWB666666666",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "..." },
        "parcel inventory": { status: "Generated", content: "..." },
    },
  },
  {
    id: "EXP-007",
    origin: "Arad, RO",
    destination: "Pitesti, RO",
    items: ["Graphics Card"],
    status: "Canceled",
    documents: {
      "proces verbal de receptie": { status: "Not Generated" },
      "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
      "parcel inventory": { status: "Not Generated" },
    },
  },
   {
    id: "EXP-008",
    origin: "Baia Mare, RO",
    destination: "Buzau, RO",
    items: ["T-shirts (Pack of 10)"],
    status: "Sent to Logistics",
    awb: "AWB888888888",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "..." },
        "parcel inventory": { status: "Generated", content: "..." },
    },
  },
];

    