
import type { Expedition } from "@/types";

export const mockExpeditions: Expedition[] = [
  {
    id: "EXP-001",
    origin: "Bucharest, RO",
    recipientName: "Mihai Eminescu",
    recipientAddress: "Cluj-Napoca, RO",
    items: ["Laptop", "Charger", "Mouse"],
    status: "New",
    documents: {
      "proces verbal de receptie": { status: "Not Generated", url: "#" },
      "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated", url: "#" },
      "parcel inventory": { status: "Not Generated", url: "#" },
    },
  },
  {
    id: "EXP-002",
    origin: "Iasi, RO",
    recipientName: "Ion Creanga",
    recipientAddress: "Timisoara, RO",
    items: ["Books (Box of 20)", "Reading light"],
    status: "AWB Generated",
    awb: "AWB123456789",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "...", url: "#" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "...", url: "#" },
        "parcel inventory": { status: "Generated", content: "...", url: "#" },
    },
  },
  {
    id: "EXP-003",
    origin: "Constanta, RO",
    recipientName: "Lucian Blaga",
    recipientAddress: "Oradea, RO",
    items: ["Office Chair", "Desk Mat"],
    status: "In Transit",
    awb: "AWB987654321",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "...", url: "#" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "...", url: "#" },
        "parcel inventory": { status: "Generated", content: "...", url: "#" },
    },
  },
    {
    id: "EXP-004",
    origin: "Craiova, RO",
    recipientName: "George Bacovia",
    recipientAddress: "Brasov, RO",
    items: ["Mechanical Keyboard", "Monitor Stand"],
    status: "Documents Generated",
    documents: {
      "proces verbal de receptie": { status: "Generated", content: "Content for proces verbal...", url: "#" },
      "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "Content for instructions...", url: "#" },
      "parcel inventory": { status: "Generated", content: "Content for inventory...", url: "#" },
    },
  },
  {
    id: "EXP-005",
    origin: "Sibiu, RO",
    recipientName: "Tudor Arghezi",
    recipientAddress: "Bucharest, RO",
    items: ["Corporate Documents (File)"],
    status: "Delivered",
    awb: "AWB555555555",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "...", url: "#" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "...", url: "#" },
        "parcel inventory": { status: "Generated", content: "...", url: "#" },
    },
  },
  {
    id: "EXP-006",
    origin: "Galati, RO",
    recipientName: "Nichita Stanescu",
    recipientAddress: "Ploiesti, RO",
    items: ["Smartphone", "Case"],
    status: "Completed",
    awb: "AWB666666666",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "...", url: "#" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "...", url: "#" },
        "parcel inventory": { status: "Generated", content: "...", url: "#" },
    },
  },
  {
    id: "EXP-007",
    origin: "Arad, RO",
    recipientName: "Vasile Alecsandri",
    recipientAddress: "Pitesti, RO",
    items: ["Graphics Card"],
    status: "Canceled",
    documents: {
      "proces verbal de receptie": { status: "Not Generated", url: "#" },
      "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated", url: "#" },
      "parcel inventory": { status: "Not Generated", url: "#" },
    },
  },
   {
    id: "EXP-008",
    origin: "Baia Mare, RO",
    recipientName: "Marin Sorescu",
    recipientAddress: "Buzau, RO",
    items: ["T-shirts (Pack of 10)"],
    status: "Sent to Logistics",
    awb: "AWB888888888",
    documents: {
        "proces verbal de receptie": { status: "Generated", content: "...", url: "#" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", content: "...", url: "#" },
        "parcel inventory": { status: "Generated", content: "...", url: "#" },
    },
  },
];

    
