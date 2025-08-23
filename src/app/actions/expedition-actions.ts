
"use server";

import { mapFields } from "@/ai/flows/field-mapper";
import { generateAwb } from "@/ai/flows/awb-generator";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp, getDocs, query } from "firebase/firestore";
import type { Recipient, Expedition, AWB } from "@/types";
import { adminApp } from "@/lib/firebase-admin";

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
                mainRecipientName: firstRow[reverseMapping['awbName']],
                mainRecipientTelephone: firstRow[reverseMapping['awbTelephone']],
                parcelCount: firstRow[reverseMapping['parcelCount']],
                packageSize: firstRow[reverseMapping['packageSize']],
            };
            
            // Clean undefined fields from AWB data
            Object.keys(awbData).forEach(key => {
                const K = key as keyof typeof awbData;
                if (awbData[K] === undefined) delete awbData[K];
            });

            batch.set(awbRef, awbData);

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

                const recipientData: Omit<Recipient, 'items' | 'documents'> & { documents?: any } = {
                    id: recipientId,
                    shipmentId: shipmentId,
                    awbId: awbId,
                    name: row[reverseMapping['name']],
                    address: row[reverseMapping['address']],
                    status: 'New',
                    group: row[reverseMapping['group']],
                    county: row[reverseMapping['county']],
                    city: row[reverseMapping['city']],
                    schoolName: row[reverseMapping['schoolName']],
                    schoolUniqueName: row[reverseMapping['schoolUniqueName']],
                    email: row[reverseMapping['email']],
                    telephone: row[reverseMapping['telephone']],
                    postalCode: row[reverseMapping['postalCode']],
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

        // 5. Create the shipment documents
        for (const [shipmentId, groupData] of shipmentsMap.entries()) {
            const shipmentRef = doc(db, "shipments", shipmentId);
            const shipmentData: Expedition = {
                id: shipmentId,
                status: "Ready for AWB",
                createdAt: serverTimestamp(),
                recipientCount: groupData.recipientCount,
                awbCount: groupData.awbIds.length,
            };
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

// Action for AWB Generation
const generateAwbActionInputSchema = z.object({
  shipmentIds: z.array(z.string()),
});

export async function generateAwbAction(input: { shipmentIds: string[] }) {
    const validatedInput = generateAwbActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for AWB generation." };
    }
    try {
        const output = await generateAwb(validatedInput.data);
        return { success: output.success, message: output.message, details: output.details };
    } catch (error: any) {
        console.error("Error in generateAwb flow:", error);
        return { success: false, message: `Failed to generate AWBs due to a server error: ${error.message}` };
    }
}


// Action for linking static documents
export async function updateRecipientDocumentsAction() {
    try {
        const bucket = adminApp.storage().bucket('expeditionflow.firebasestorage.app');
        
        // Define file paths
        const inventoryPath = 'static/inventory.xlsx';
        const instructionsPath = 'static/instructions.pdf';
        const procesVerbalPath = 'static/proces-verbal-de-receptie.pdf';

        // Check for existence and get public URLs
        const inventoryFile = bucket.file(inventoryPath);
        const instructionsFile = bucket.file(instructionsPath);
        const procesVerbalFile = bucket.file(procesVerbalPath);

        const [inventoryExists, instructionsExists, procesVerbalExists] = await Promise.all([
            inventoryFile.exists().then(r => r[0]),
            instructionsFile.exists().then(r => r[0]),
            procesVerbalFile.exists().then(r => r[0])
        ]);

        if (!inventoryExists || !instructionsExists || !procesVerbalExists) {
             return { success: false, error: "A static file was not found in Storage. Please ensure 'inventory.xlsx', 'instructions.pdf', and 'proces-verbal-de-receptie.pdf' are all uploaded." };
        }

        const inventoryUrl = inventoryFile.publicUrl();
        const instructionsUrl = instructionsFile.publicUrl();
        const procesVerbalUrl = procesVerbalFile.publicUrl();

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
            batch.update(recipientRef, {
                'documents.parcel inventory.status': 'Generated',
                'documents.parcel inventory.url': inventoryUrl,
                'documents.instructiuni pentru confirmarea primirii coletului.status': 'Generated',
                'documents.instructiuni pentru confirmarea primirii coletului.url': instructionsUrl,
                'documents.proces verbal de receptie.status': 'Generated',
                'documents.proces verbal de receptie.url': procesVerbalUrl,
            });
        });

        await batch.commit();

        return { success: true, message: `Successfully updated ${recipients.length} recipients with static document links.` };
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

        if (!file) {
            return { success: false, error: 'No file provided.' };
        }
        
        let filePath = '';
        if (fileType === 'inventory') {
            filePath = 'static/inventory.xlsx';
        } else if (fileType === 'instructions') {
            filePath = 'static/instructions.pdf';
        } else if (fileType === 'procesVerbal') {
            filePath = 'static/proces-verbal-de-receptie.pdf';
        } else {
            return { success: false, error: 'Invalid file type specified.' };
        }
        
        const bucket = adminApp.storage().bucket('expeditionflow.firebasestorage.app');
        
        const fileBuffer = await file.arrayBuffer();
        const storageFile = bucket.file(filePath);

        await storageFile.save(Buffer.from(fileBuffer), {
            metadata: {
                contentType: file.type,
            },
        });
        
        // Make the file public immediately after upload
        await storageFile.makePublic();

        return { success: true, message: `${file.name} uploaded successfully.` };

    } catch (error: any) {
        console.error('Upload failed:', error);
        return { success: false, error: `Upload failed: ${error.message}` };
    }
}

// Action to get status of static files
export async function getStaticFilesStatusAction() {
    try {
        const bucket = adminApp.storage().bucket('expeditionflow.firebasestorage.app');
        
        const fileTypes = {
            inventory: 'static/inventory.xlsx',
            instructions: 'static/instructions.pdf',
            procesVerbal: 'static/proces-verbal-de-receptie.pdf',
        };

        const statuses = {} as Record<string, {name: string, url: string} | null>;

        for (const [type, path] of Object.entries(fileTypes)) {
            const file = bucket.file(path);
            const [exists] = await file.exists();

            if (exists) {
                // File should be public already, but let's ensure it.
                await file.makePublic();
                const publicUrl = file.publicUrl();

                statuses[type] = {
                    name: path.split('/').pop() || 'Unknown File',
                    url: publicUrl,
                };
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
