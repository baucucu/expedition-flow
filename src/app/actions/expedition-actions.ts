
"use server";

import { documentContentGenerator, type DocumentContentGeneratorInput } from "@/ai/flows/document-content-generator";
import { mapFields } from "@/ai/flows/field-mapper";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp, where, getDocs, query } from "firebase/firestore";
import type { Recipient, Expedition, AWB } from "@/types";

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
export type FieldMapperInput = z.infer<typeof mapFieldsActionInputSchema>;


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

type MappedRow = Omit<Recipient, 'id' | 'status' | 'documents' | 'items'> & {
    id: string; // From id_unic
    awbName?: string;
    awbTelephone?: string;
    boxWeight?: number;
};

export async function createExpeditionFromImport(input: {data: any[], mapping: Record<string,string>}) {
    const validation = createExpeditionActionInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Invalid input for creating expedition." };
    }

    const { data: rawData, mapping } = validation.data;

    const reverseMapping: Record<string, string> = {};
    for (const key in mapping) {
        if (mapping[key] !== 'ignore') {
            reverseMapping[mapping[key]] = key;
        }
    }
    
    // Group recipients by shipmentId
    const shipmentsMap = new Map<string, MappedRow[]>();

    for (const row of rawData) {
        const shipmentIdValue = row[reverseMapping['shipmentId']];
        if (!shipmentIdValue) continue;

        const shipmentId = String(shipmentIdValue);

        const recipientData: MappedRow = {
            id: String(row[reverseMapping['id']] || doc(collection(db, 'recipients')).id),
            name: row[reverseMapping['name']],
            address: row[reverseMapping['address']],
            email: row[reverseMapping['email']],
            telephone: row[reverseMapping['telephone']],
            postalCode: row[reverseMapping['postalCode']],
            group: row[reverseMapping['group']],
            county: row[reverseMapping['county']],
            city: row[reverseMapping['city']],
            schoolName: row[reverseMapping['schoolName']],
            schoolUniqueName: row[reverseMapping['schoolUniqueName']],
            shipmentId: shipmentId,
            boxType: row[reverseMapping['boxType']],
            // AWB details to be grouped later
            awbName: row[reverseMapping['awbName']],
            awbTelephone: row[reverseMapping['awbTelephone']],
            boxWeight: row[reverseMapping['boxWeight']],
        };

        if (!shipmentsMap.has(shipmentId)) {
            shipmentsMap.set(shipmentId, []);
        }
        shipmentsMap.get(shipmentId)!.push(recipientData);
    }
    
    if (shipmentsMap.size === 0) {
        return { success: false, error: "No valid shipments found. Ensure 'shipmentId' is mapped and present." };
    }

    try {
        const batch = writeBatch(db);
        const createdShipmentIds: string[] = [];
        let totalAwbsCreated = 0;

        for (const [shipmentId, recipients] of shipmentsMap.entries()) {
            
            // Create or update Shipment document
            const shipmentRef = doc(db, "shipments", shipmentId);
            const shipmentData: Partial<Expedition> = {
                status: "New",
                createdAt: serverTimestamp(),
                recipientCount: recipients.length
            };
            batch.set(shipmentRef, shipmentData, { merge: true });
            createdShipmentIds.push(shipmentId);

            // Group recipients by AWB info to create consolidated AWBs
            const awbsMap = new Map<string, MappedRow[]>();
            for (const recipient of recipients) {
                // A unique key for an AWB is its name within a shipment
                const awbKey = `${recipient.awbName}`; 
                if (!awbsMap.has(awbKey)) {
                    awbsMap.set(awbKey, []);
                }
                awbsMap.get(awbKey)!.push(recipient);
            }

            // Create AWB and Recipient documents
            for (const [awbKey, awbRecipients] of awbsMap.entries()) {
                const awbId = doc(collection(db, 'awbs')).id;
                totalAwbsCreated++;

                const firstRecipientOfAwb = awbRecipients[0];
                const awbData: Partial<AWB> = {
                    id: awbId,
                    shipmentId: shipmentId,
                    awbName: firstRecipientOfAwb.awbName!,
                    recipientIds: awbRecipients.map(r => r.id),
                };
                
                if (firstRecipientOfAwb.awbTelephone) {
                    awbData.awbTelephone = firstRecipientOfAwb.awbTelephone;
                }
                if (firstRecipientOfAwb.boxWeight) {
                    awbData.boxWeight = firstRecipientOfAwb.boxWeight;
                }

                const awbRef = doc(db, "awbs", awbId);
                batch.set(awbRef, awbData);

                for (const recipient of awbRecipients) {
                    const recipientRef = doc(db, "recipients", recipient.id);
                    const { awbName, awbTelephone, boxWeight, ...recipientFields } = recipient;
                    const recipientForDb: Omit<Recipient, 'id' | 'items'> = {
                        ...recipientFields,
                        awbId: awbId, // Link recipient to the AWB
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
        }

        await batch.commit();
        return { success: true, data: { 
            shipmentCount: createdShipmentIds.length, 
            awbCount: totalAwbsCreated,
            recipientCount: rawData.length, 
            shipmentIds: createdShipmentIds 
        }};
    } catch (error: any) {
        console.error("Error writing to Firestore:", error);
        return { success: false, error: `Failed to save data to the database: ${error.message}` };
    }
}
