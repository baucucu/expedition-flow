
import type { Expedition, Recipient } from "@/types";

// --- Recipients Data ---

const recipients: Recipient[] = [
  // Expedition 1
  {
    id: "REC-001",
    name: "Mihai Eminescu",
    address: "Cluj-Napoca, RO",
    items: ["Laptop", "Charger"],
    status: "Documents Generated",
    documents: {
      "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
      "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
      "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  {
    id: "REC-002",
    name: "Ion Creanga",
    address: "Timisoara, RO",
    items: ["Books (Box of 20)"],
    status: "New",
    documents: {
      "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
      "instructiuni pentru confirmarea primirii coletului": { status: "Failed" },
      "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  // Expedition 2
  {
    id: "REC-003",
    name: "Lucian Blaga",
    address: "Oradea, RO",
    items: ["Office Chair", "Desk Mat"],
    status: "Delivered",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  // Expedition 3
  {
    id: "REC-004",
    name: "George Bacovia",
    address: "Brasov, RO",
    items: ["Keyboard", "Monitor Stand"],
    status: "New",
    documents: {
        "proces verbal de receptie": { status: "Not Generated" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
        "parcel inventory": { status: "Not Generated" },
    },
  },
  // Expedition 4
  {
    id: "REC-005",
    name: "Vasile Alecsandri",
    address: "Iasi, RO",
    items: ["Monitor", "Webcam"],
    status: "New", // This recipient is part of a failed expedition
    documents: {
        "proces verbal de receptie": { status: "Not Generated" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
        "parcel inventory": { status: "Not Generated" },
    },
  },
  // Expedition 5
  {
    id: "REC-006",
    name: "Tudor Arghezi",
    address: "Sibiu, RO",
    items: ["Poetry Collection"],
    status: "New", // This recipient is part of a failed expedition
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  // Expedition 6
  {
    id: "REC-007",
    name: "Nichita Stanescu",
    address: "Ploiesti, RO",
    items: ["Artwork"],
    status: "Completed",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  {
    id: "REC-008",
    name: "Marin Sorescu",
    address: "Craiova, RO",
    items: ["Sculpture"],
    status: "Delivered",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  // Expedition 7
  {
    id: "REC-009",
    name: "Tristan Tzara",
    address: "Bacau, RO",
    items: ["Dada Manifesto"],
    status: "New",
    documents: {
        "proces verbal de receptie": { status: "Not Generated" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
        "parcel inventory": { status: "Not Generated" },
    },
  },
  // Expedition 8
  {
    id: "REC-010",
    name: "Eugen Ionesco",
    address: "Slatina, RO",
    items: ["Play Scripts"],
    status: "New",
    documents: {
        "proces verbal de receptie": { status: "Not Generated" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
        "parcel inventory": { status: "Not Generated" },
    },
  },
  // Expedition 9
  {
    id: "REC-011",
    name: "Mircea Eliade",
    address: "Galati, RO",
    items: ["History Books"],
    status: "Delivered",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  {
    id: "REC-012",
    name: "Emil Cioran",
    address: "Rasunari, RO",
    items: ["Philosophy Texts"],
    status: "New",
    documents: {
        "proces verbal de receptie": { status: "Failed" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Failed" },
        "parcel inventory": { status: "Failed" },
    },
  },
  {
    id: "REC-013",
    name: "Constantin Brancusi",
    address: "Targu Jiu, RO",
    items: ["Art Supplies"],
    status: "Returned",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  // Expedition 10
  {
    id: "REC-014",
    name: "George Enescu",
    address: "Liveni, RO",
    items: ["Musical Score", "Violin"],
    status: "Documents Generated",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  // Expedition 11
  {
    id: "REC-015",
    name: "Gheorghe Hagi",
    address: "Constanta, RO",
    items: ["Signed Football"],
    status: "Delivered",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  // Expedition 12
  {
    id: "REC-016",
    name: "Nadia Comaneci",
    address: "Onesti, RO",
    items: ["Gymnastics Leotard"],
    status: "Completed",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  {
    id: "REC-017",
    name: "Simona Halep",
    address: "Bucuresti, RO",
    items: ["Tennis Racket"],
    status: "Completed",
    documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
    // Expedition 13
  {
    id: "REC-018",
    name: "Ilie Nastase",
    address: "Arad, RO",
    items: ["Tennis Balls"],
    status: "New",
    documents: {
        "proces verbal de receptie": { status: "Failed" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
        "parcel inventory": { status: "Not Generated" },
    },
  },
  // Expedition 14
  {
    id: "REC-019",
    name: "Gica Popescu",
    address: "Calafat, RO",
    items: ["Captain's Armband"],
    status: "New",
    documents: {
        "proces verbal de receptie": { status: "Not Generated" },
        "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
        "parcel inventory": { status: "Not Generated" },
    },
  },
  // Expedition 15
  {
    id: "REC-020",
    name: "Ciprian Marica",
    address: "Deva, RO",
    items: ["Football Boots"],
    status: "Delivered",
     documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  {
    id: "REC-021",
    name: "Adrian Mutu",
    address: "Pitesti, RO",
    items: ["Jersey"],
    status: "Returned",
     documents: {
        "proces verbal de receptie": { status: "Generated", url: "#", content: "..." },
        "instructiuni pentru confirmarea primirii coletului": { status: "Generated", url: "#", content: "..." },
        "parcel inventory": { status: "Generated", url: "#", content: "..." },
    },
  },
  // For new recipients scorecard
  {
    id: "REC-022",
    name: "New Recipient A",
    address: "Satu Mare, RO",
    items: ["Item 1"],
    status: "New",
    documents: {
      "proces verbal de receptie": { status: "Not Generated" },
      "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
      "parcel inventory": { status: "Not Generated" },
    },
  },
  {
    id: "REC-023",
    name: "New Recipient B",
    address: "Bistrita, RO",
    items: ["Item 2"],
    status: "New",
    documents: {
      "proces verbal de receptie": { status: "Not Generated" },
      "instructiuni pentru confirmarea primirii coletului": { status: "Not Generated" },
      "parcel inventory": { status: "Not Generated" },
    },
  },
];

export const mockExpeditions: Expedition[] = [
  {
    id: "EXP-C-001",
    origin: "Bucharest, RO",
    destination: "Domestic",
    status: "Ready for Logistics",
    awb: "AWB-MULTI-123",
    recipients: [recipients[0], recipients[1]],
  },
  {
    id: "EXP-S-002",
    origin: "Constanta, RO",
    destination: "Oradea, RO",
    status: "In Transit",
    awb: "AWB-SINGLE-456",
    recipients: [recipients[2]],
  },
  {
    id: "EXP-S-003",
    origin: "Craiova, RO",
    destination: "Brasov, RO",
    status: "New",
    awb: undefined,
    recipients: [recipients[3]],
  },
  {
    id: "EXP-F-004",
    origin: "Sibiu, RO",
    destination: "Iasi, RO",
    status: "AWB Generation Failed",
    awb: undefined,
    recipients: [recipients[4]],
  },
  {
    id: "EXP-F-005",
    origin: "Buzau, RO",
    destination: "Sibiu, RO",
    status: "Email Send Failed",
    awb: "AWB-FAIL-789",
    recipients: [recipients[5]],
  },
  {
    id: "EXP-C-006",
    origin: "Bucharest, RO",
    destination: "Domestic",
    status: "Completed",
    awb: "AWB-COMP-101",
    recipients: [recipients[6], recipients[7]],
  },
  {
    id: "EXP-S-007",
    origin: "Suceava, RO",
    destination: "Bacau, RO",
    status: "Canceled",
    awb: "AWB-CANCEL-112",
    recipients: [recipients[8]],
  },
  {
    id: "EXP-S-008",
    origin: "Ramnicu Valcea, RO",
    destination: "Slatina, RO",
    status: "Lost or Damaged",
    awb: "AWB-LOST-131",
    recipients: [recipients[9]],
  },
  {
    id: "EXP-C-009",
    origin: "Braila, RO",
    destination: "Domestic",
    status: "Sent to Logistics",
    awb: "AWB-MIXED-415",
    recipients: [recipients[10], recipients[11], recipients[12]],
  },
  {
    id: "EXP-S-010",
    origin: "Botosani, RO",
    destination: "Liveni, RO",
    status: "Ready for Logistics",
    awb: "AWB-READY-161",
    recipients: [recipients[13]],
  },
  {
    id: "EXP-S-011",
    origin: "Bucharest, RO",
    destination: "Constanta, RO",
    status: "Delivered",
    awb: "AWB-LEGEND-010",
    recipients: [recipients[14]],
  },
  {
    id: "EXP-C-012",
    origin: "Onesti, RO",
    destination: "Domestic",
    status: "Completed",
    awb: "AWB-CHAMPS-1010",
    recipients: [recipients[15], recipients[16]],
  },
    {
    id: "EXP-S-013",
    origin: "Bucharest, RO",
    destination: "Arad, RO",
    status: "AWB Generated",
    awb: "AWB-TENNIS-001",
    recipients: [recipients[17]],
  },
  {
    id: "EXP-S-014",
    origin: "Craiova, RO",
    destination: "Calafat, RO",
    status: "New",
    awb: undefined,
    recipients: [recipients[18]],
  },
  {
    id: "EXP-C-015",
    origin: "Gelsenkirchen, DE",
    destination: "Domestic",
    status: "In Transit",
    awb: "AWB-FOOTBALL-EU",
    recipients: [recipients[19], recipients[20]],
  },
   {
    id: "EXP-N-016",
    origin: "Zalau, RO",
    destination: "Satu Mare, RO",
    status: "New",
    awb: undefined,
    recipients: [recipients[21]],
  },
  {
    id: "EXP-N-017",
    origin: "Alexandria, RO",
    destination: "Bistrita, RO",
    status: "New",
    awb: undefined,
    recipients: [recipients[22]],
  }
];
