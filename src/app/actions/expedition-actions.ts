
"use server";

import { documentContentGenerator, type DocumentContentGeneratorInput } from "@/ai/flows/document-content-generator";
import { mapFields } from "@/ai/flows/field-mapper";
import type { FieldMapperInput } from '@/ai/flows/field-mapper';
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import type { Recipient, Expedition } from "@/types";

const generateActionInputSchema = z.object({
    documentType: z.enum(['proces verbal de receptie', 'instructiuni pentru confirmarea primirii coletului', 'parcel inventory']),
    expeditionDetails: z.string(),
    existingContent: z.string().optional(),
});

export async function generateDocumentContentAction(input: DocumentContentGeneratorInput) {
    const validatedInput = generateActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, error: "Invalid input." };
    }

    try {
        const output = await documentContentGenerator(validatedInput.data);
        return { success: true, data: output };
    } catch (error) {
        console.error("Error in documentContentGenerator flow:", error);
        return { success: false, error: "Failed to generate document content due to a server error." };
    }
}


const mapFieldsActionInputSchema = z.object({
  fileColumns: z.array(z.string()),
  appFields: z.array(z.object({ value: z.string(), label: z.string() })),
});

export async function mapFieldsAction(input: FieldMapperInput) {
    const validatedInput = mapFieldsActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, error: "Invalid input for field mapping." };
    }

    try {
        const output = await mapFields(validatedInput.data);
        return { success: true, data: output };
    } catch (error) {
        console.error("Error in mapFields flow:", error);
        return { success: false, error: "Failed to suggest field mapping due to a server error." };
    }
}

const createExpeditionActionInputSchema = z.object({
    data: z.array(z.record(z.string(), z.any())),
    mapping: z.record(z.string(), z.string()),
});

type MappedRow = Omit<Recipient, 'id' | 'status' | 'documents'> & {
    id: string; // From id_unic
};

export async function createExpeditionFromImport(input: {data: any[], mapping: Record<string,string>}) {
    const validation = createExpeditionActionInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Invalid input for creating expedition." };
    }

    const { data: rawData, mapping } = validation.data;

    // Create a reverse mapping for easier lookup
    const reverseMapping: Record<string, string> = {};
    for (const key in mapping) {
        if (mapping[key] !== 'ignore') {
            reverseMapping[mapping[key]] = key;
        }
    }
    
    // Group recipients by shipmentId
    const shipmentsMap = new Map<string, MappedRow[]>();

    for (const row of rawData) {
        const shipmentId = row[reverseMapping['shipmentId']];
        if (!shipmentId) continue;

        const recipientData: MappedRow = {
            id: String(row[reverseMapping['id']] || doc(collection(db, 'recipients')).id), // Use imported ID or generate a new one
            name: row[reverseMapping['name']],
            address: row[reverseMapping['address']],
            items: [], // Assuming items are not in the import file for now
            email: row[reverseMapping['email']],
            telephone: row[reverseMapping['telephone']],
            group: row[reverseMapping['group']],
            county: row[reverseMapping['county']],
            city: row[reverseMapping['city']],
            schoolName: row[reverseMapping['schoolName']],
            schoolUniqueName: row[reverseMapping['schoolUniqueName']],
            shipmentId: shipmentId,
            boxType: row[reverseMapping['boxType']],
        };

        if (!shipmentsMap.has(shipmentId)) {
            shipmentsMap.set(shipmentId, []);
        }
        shipmentsMap.get(shipmentId)!.push(recipientData);
    }
    
    if (shipmentsMap.size === 0) {
        return { success: false, error: "No valid shipments found in the file. Ensure 'shipmentId' is mapped and present." };
    }

    try {
        const batch = writeBatch(db);
        const createdShipmentIds: string[] = [];

        for (const [shipmentId, recipients] of shipmentsMap.entries()) {
            // Create Shipment document
            const shipmentRef = doc(db, "shipments", shipmentId);
            const shipmentData: Omit<Expedition, 'id' | 'recipients'> = {
                origin: "Imported", // Placeholder
                destination: "Domestic", // Placeholder
                status: "New",
                awb: undefined,
            };
            batch.set(shipmentRef, {
                ...shipmentData,
                createdAt: serverTimestamp(),
                recipientCount: recipients.length
            });
            createdShipmentIds.push(shipmentId);

            // Create Recipient documents
            for (const recipient of recipients) {
                const recipientRef = doc(db, "recipients", recipient.id);
                 const recipientForDb: Omit<Recipient, 'id'> = {
                    ...recipient,
                    status: 'New',
                    documents: {
                        'proces verbal de receptie': { status: 'Not Generated' },
                        'instructiuni pentru confirmarea primirii coletului': { status: 'Not Generated' },
                        'parcel inventory': { status: 'Not Generated' },
                    },
                };
                batch.set(recipientRef, recipientForDb);
            }
        }

        await batch.commit();
        return { success: true, data: { shipmentCount: createdShipmentIds.length, recipientCount: rawData.length, shipmentIds: createdShipmentIds } };
    } catch (error: any) {
        console.error("Error writing to Firestore:", error);
        return { success: false, error: `Failed to save data to the database: ${error.message}` };
    }
}
