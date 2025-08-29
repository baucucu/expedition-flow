
"use server";

import { mapFields } from "@/ai/flows/field-mapper";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import type { Recipient, Expedition, AWB } from "@/types";

// Action for Field Mapping
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


// Action for Creating Expedition from Import
const createExpeditionActionInputSchema = z.object({
    data: z.array(z.record(z.string(), z.any())),
    mapping: z.record(z.string(), z.string()),
});

type MappedRow = { [key: string]: any };

export async function createExpeditionFromImport(input: {data: any[], mapping: Record<string,string>}) {
    const validation = createExpeditionActionInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Invalid input for creating expedition." };
    }

    const { data: rawData, mapping } = validation.data;

    // 1. Create a reverse mapping for easy lookup of original column names
    const reverseMapping: Record<string, string> = {};
    for (const key in mapping) {
        if (mapping[key] !== 'ignore') {
            reverseMapping[mapping[key]] = key;
        }
    }

    // 2. Group all rows by their unique AWB. An AWB is unique per shipment.
    const awbsMap = new Map<string, MappedRow[]>();
    for (const row of rawData) {
        const shipmentId = String(row[reverseMapping['shipmentId']] ?? 'UNKNOWN_SHIPMENT');
        const awbName = row[reverseMapping['awbName']] ?? 'UNKNOWN_AWB';
        const awbKey = `${shipmentId}-${awbName}`;

        if (!awbsMap.has(awbKey)) {
            awbsMap.set(awbKey, []);
        }
        awbsMap.get(awbKey)!.push(row);
    }
    
    // 3. Group the generated AWBs by shipment
    const shipmentsMap = new Map<string, { awbIds: string[], recipientCount: number }>();

    try {
        const batch = writeBatch(db);
        let totalAwbsCreated = 0;
        
        // 4. Process each AWB group
        for (const [awbKey, recipientRows] of awbsMap.entries()) {
            const firstRow = recipientRows[0];
            const shipmentId = String(firstRow[reverseMapping['shipmentId']]);

            // Create the AWB document
            const awbRef = doc(collection(db, "awbs"));
            const awbId = awbRef.id;
            totalAwbsCreated++;

            const awbData: Partial<AWB> = {
                id: awbId,
                shipmentId: shipmentId,
                status: "New",
                mainRecipientName: firstRow[reverseMapping['awbName']],
                mainRecipientTelephone: firstRow[reverseMapping['awbTelephone']],
                mainRecipientEmail: firstRow[reverseMapping['email']],
                parcelCount: recipientRows.length,
                packageSize: firstRow[reverseMapping['packageSize']],
                address: firstRow[reverseMapping['address']],
                city: firstRow[reverseMapping['city']],
                county: firstRow[reverseMapping['county']],
                postalCode: firstRow[reverseMapping['postalCode']],
            };
            
            // Clean undefined fields from AWB data
            Object.keys(awbData).forEach(key => {
                const K = key as keyof typeof awbData;
                if (awbData[K] === undefined) delete awbData[K];
            });

            batch.set(awbRef, awbData as AWB);

            // Update shipments map
            if (!shipmentsMap.has(shipmentId)) {
                shipmentsMap.set(shipmentId, { awbIds: [], recipientCount: 0 });
            }
            const shipmentGroup = shipmentsMap.get(shipmentId)!;
            shipmentGroup.awbIds.push(awbId);
            
            // Create a recipient document for each row in the AWB group
            for (const row of recipientRows) {
                const recipientId = String(row[reverseMapping['recipientId']]);
                const recipientRef = doc(db, "recipients", recipientId);

                const recipientData: Partial<Omit<Recipient, 'documents'>> & { documents?: any } = {
                    id: recipientId,
                    shipmentId: shipmentId,
                    awbId: awbId,
                    name: row[reverseMapping['name']],
                    status: 'New',
                    group: row[reverseMapping['group']],
                    schoolName: row[reverseMapping['schoolName']],
                    schoolUniqueName: row[reverseMapping['schoolUniqueName']],
                    email: row[reverseMapping['email']],
                    telephone: row[reverseMapping['telephone']],
                };

                // Add default document structure
                recipientData.documents = {
                    'proces verbal de receptie': { status: 'Not Generated' },
                    'instructiuni pentru confirmarea primirii coletului': { status: 'Not Generated' },
                    'parcel inventory': { status: 'Not Generated' },
                };

                // Clean undefined fields from Recipient data
                Object.keys(recipientData).forEach(key => {
                     const K = key as keyof typeof recipientData;
                    if (recipientData[K] === undefined) delete recipientData[K];
                });

                batch.set(recipientRef, recipientData, { merge: true });
                shipmentGroup.recipientCount++;
            }
        }

        // 5. Create or update the shipment documents
        for (const [shipmentId, groupData] of shipmentsMap.entries()) {
            const shipmentRef = doc(db, "shipments", shipmentId);
            const shipmentData: Partial<Expedition> = {
                id: shipmentId,
                status: "Ready for AWB",
                createdAt: serverTimestamp(),
                recipientCount: groupData.recipientCount,
                awbCount: groupData.awbIds.length,
            };
             // Use merge: true to update existing shipments or create new ones
            batch.set(shipmentRef, shipmentData, { merge: true });
        }

        await batch.commit();
        
        return { 
            success: true, 
            data: { 
                shipmentCount: shipmentsMap.size, 
                awbCount: totalAwbsCreated,
                recipientCount: rawData.length,
            }
        };
    } catch (error: any) {
        console.error("Error writing to Firestore:", error);
        return { success: false, error: `Failed to save data to the database: ${error.message}` };
    }
}
