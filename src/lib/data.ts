
import type { Expedition } from "@/types";

export const mockExpeditions: Expedition[] = [
  {
    id: "EXP-C-001",
    origin: "Bucharest, RO",
    status: "AWB Generated",
    awb: "AWB-CONSOLIDATED-123",
    recipients: [
      {
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
      },
      {
        id: "REC-001B",
        name: "Ion Creanga",
        address: "Timisoara, RO",
        items: ["Books (Box of 20)", "Reading light"],
        status: "Documents Generated",
        documents: {
            "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
            "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
            "parcel inventory": { status: "Generated", url: "#", content: "..." },
        },
      }
    ]
  },
  {
    id: "EXP-S-002",
    origin: "Constanta, RO",
    status: "In Transit",
    awb: "AWB-SINGLE-456",
    recipients: [
        {
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
        }
    ]
  },
    {
    id: "EXP-S-003",
    origin: "Craiova, RO",
    status: "New",
    recipients: [
      {
        id: "REC-003A",
        name: "George Bacovia",
        address: "Brasov, RO",
        items: ["Mechanical Keyboard", "Monitor Stand"],
        status: "New",
        documents: {
            "proces verbal de receptie": { status: "Not Generated", url: "#" },
            "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated", url: "#" },
            "parcel inventory": { status: "Not Generated", url: "#" },
        },
      }
    ]
  },
];
