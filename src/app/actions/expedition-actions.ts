
"use server";

import { mapFields } from "@/ai/flows/field-mapper";
import { generateProcesVerbal } from "@/ai/flows/pv-generator";
import { testSamedayAwbGeneration } from "@/ai/flows/sameday-test-awb-generator";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp, getDocs, query, getDoc, setDoc, where, updateDoc } from "firebase/firestore";
import { adminApp } from "@/lib/firebase-admin";
import { tasks } from "@trigger.dev/sdk";


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

import type { Recipient, Expedition, AWB } from "@/types";
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

// Action for linking static documents
export async function updateRecipientDocumentsAction() {
    try {
        const statuses = await getStaticFilesStatusAction();

        if (!statuses.success || !statuses.data) {
            return { success: false, error: 'Could not retrieve static file statuses.' };
        }

        const updateData: Record<string, any> = {};
        let filesToSyncCount = 0;

        if (statuses.data.inventory?.url) {
            updateData['documents.parcel inventory.status'] = 'Generated';
            updateData['documents.parcel inventory.url'] = statuses.data.inventory.url;
            filesToSyncCount++;
        }
        if (statuses.data.instructions?.url) {
            updateData['documents.instructiuni pentru confirmarea primirii coletului.status'] = 'Generated';
            updateData['documents.instructiuni pentru confirmarea primirii coletului.url'] = statuses.data.instructions.url;
            filesToSyncCount++;
        }
        
        if (filesToSyncCount === 0) {
            return { success: false, error: 'No static files have been uploaded. Nothing to sync.' };
        }

        // Get all recipient documents
        const recipientsQuery = query(collection(db, "recipients"));
        const querySnapshot = await getDocs(recipientsQuery);
        const recipients = querySnapshot.docs;

        if (recipients.length === 0) {
            return { success: true, message: "No recipients found to update." };
        }

        // Create a batch to update all recipients
        const batch = writeBatch(db);
        recipients.forEach(docSnap => {
            const recipientRef = doc(db, "recipients", docSnap.id);
            batch.update(recipientRef, updateData);
        });

        await batch.commit();

        return { success: true, message: `Successfully synced ${filesToSyncCount} file(s) to ${recipients.length} recipients.` };
    } catch (error: any) {
        console.error("Error updating recipient documents:", error);
        return { success: false, error: `An unexpected error occurred: ${error.message}` };
    }
}

// Action to upload a static file
export async function uploadStaticFileAction(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const fileType = formData.get('fileType') as string;

        if (!file || !fileType) {
            return { success: false, error: 'File or file type not provided.' };
        }
        
        const filePath = `static/${fileType}/${file.name}`;
        
        const bucket = adminApp.storage().bucket();
        const storageFile = bucket.file(filePath);

        const fileBuffer = await file.arrayBuffer();
        await storageFile.save(Buffer.from(fileBuffer), {
            metadata: { contentType: file.type },
        });
        
        await storageFile.makePublic();

        // Save the file path to Firestore
        const docRef = doc(db, 'static_documents', fileType);
        await setDoc(docRef, { path: filePath, name: file.name, uploadedAt: serverTimestamp() });

        return { success: true, message: `${file.name} uploaded successfully.` };

    } catch (error: any) {
        console.error('Upload failed:', error);
        return { success: false, error: `Upload failed: ${error.message}` };
    }
}

// Action to get status of static files
export async function getStaticFilesStatusAction() {
    try {
        const bucket = adminApp.storage().bucket();
        const statuses: Record<string, {name: string, url: string} | null> = {};
        const fileTypes = ['inventory', 'instructions'];

        for (const type of fileTypes) {
            const docRef = doc(db, 'static_documents', type);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().path) {
                const filePath = docSnap.data().path;
                const fileName = docSnap.data().name;
                const file = bucket.file(filePath);
                
                // We assume the file is public from the upload action.
                const [exists] = await file.exists();
                if (exists) {
                    await file.makePublic();
                    const publicUrl = file.publicUrl();
                    statuses[type] = {
                        name: fileName,
                        url: publicUrl,
                    };
                } else {
                    statuses[type] = null;
                }
            } else {
                statuses[type] = null;
            }
        }
        return { success: true, data: statuses };

    } catch (error: any) {
        console.error("Error getting static file status:", error);
        return { success: false, error: `An unexpected error occurred: ${error.message}` };
    }
}

// Action for PV Generation
const generatePvActionInputSchema = z.object({
  recipients: z.array(z.object({
      id: z.string(),
      name: z.string(),
  })),
});

export async function generateProcesVerbalAction(input: z.infer<typeof generatePvActionInputSchema>) {
    const validatedInput = generatePvActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for PV generation." };
    }
    try {
        const result = await generateProcesVerbal(validatedInput.data);
        return result; // Directly return the result from the flow
    } catch (error: any) {
        console.error("Error in generateProcesVerbal flow:", error);
        return { success: false, message: `Failed to start PV generation due to a server error: ${error.message}` };
    }
}

// Action for testing Sameday AWB generation
export async function testSamedayAwbAction() {
    try {
        const output = await testSamedayAwbGeneration();
        return { success: true, data: output };
    } catch (error: any) {
        console.error("Error in testSamedayAwbGeneration flow:", error);
        return { success: false, error: `Failed to call Sameday API: ${error.message}` };
    }
}

// Action for Queuing Shipment AWB Generation with Trigger.dev
const queueShipmentAwbGenerationActionInputSchema = z.object({
  awbsToQueue: z.array(z.object({
    shipmentId: z.string(),
    awbId: z.string(),
  })),
});


export async function queueShipmentAwbGenerationAction(input: z.infer<typeof queueShipmentAwbGenerationActionInputSchema>) {
    const validatedInput = queueShipmentAwbGenerationActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for queueing AWB generation." };
    }

    const { awbsToQueue } = validatedInput.data;

    if (!awbsToQueue || !Array.isArray(awbsToQueue)) {
        return { success: false, message: "Internal error: awbsToQueue is not a valid array." };
    }
    
    // Get unique shipment IDs
    const shipmentIds = [...new Set(awbsToQueue.map(item => item.shipmentId))];

    try {
        // 1. Mark all relevant AWBs as 'Queued' in Firestore in a single batch
        const batch = writeBatch(db);
        for (const item of awbsToQueue) {
            const awbRef = doc(db, "awbs", item.awbId);
            batch.update(awbRef, { status: "Queued" });
        }
        await batch.commit();


        // 2. Prepare the events for Trigger.dev for each unique shipment
        const events = shipmentIds.map(shipmentId => ({
            name: "awb-generator", // Task ID from src/trigger/awb.ts
            payload: { shipmentId },
        }));

        // 3. Send all events to Trigger.dev in a single call
        if (events.length > 0) {
            await tasks.batchTrigger(events);
        }

        return { 
            success: true, 
            message: `Successfully queued ${shipmentIds.length} shipment(s) for AWB generation.`
        };

    } catch (error: any) {
        console.error("Error queueing AWB generation:", error);
        return { success: false, message: `Failed to queue jobs: ${error.message}` };
    }
}
