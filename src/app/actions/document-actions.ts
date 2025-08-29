
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs, query, setDoc, getDoc } from "firebase/firestore";
import { generateProcesVerbal } from "@/ai/flows/pv-generator";

// Action for linking static documents
export async function updateRecipientDocumentsAction() {
    try {
        const statuses = await getStaticFilesStatusAction();

        if (!statuses.success || !statuses.data) {
            return { success: false, error: 'Could not retrieve static file statuses.' };
        }

        const updateData: Record<string, any> = {};
        let filesToSyncCount = 0;
        
        const constructGdriveUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`;

        if (statuses.data.inventory?.fileId) {
            updateData['documents.parcel inventory.status'] = 'Generated';
            updateData['documents.parcel inventory.url'] = constructGdriveUrl(statuses.data.inventory.fileId);
            updateData['documents.parcel inventory.fileId'] = statuses.data.inventory.fileId;
            filesToSyncCount++;
        }
        if (statuses.data.instructions?.fileId) {
            updateData['documents.instructiuni pentru confirmarea primirii coletului.status'] = 'Generated';
            updateData['documents.instructiuni pentru confirmarea primirii coletului.url'] = constructGdriveUrl(statuses.data.instructions.fileId);
            updateData['documents.instructiuni pentru confirmarea primirii coletului.fileId'] = statuses.data.instructions.fileId;
            filesToSyncCount++;
        }
        
        if (filesToSyncCount === 0) {
            return { success: false, error: 'No static file IDs have been saved. Nothing to sync.' };
        }

        const recipientsQuery = query(collection(db, "recipients"));
        const querySnapshot = await getDocs(recipientsQuery);
        const recipients = querySnapshot.docs;

        if (recipients.length === 0) {
            return { success: true, message: "No recipients found to update." };
        }

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

// Action to save a static file ID
const saveLinkSchema = z.object({
    fileType: z.enum(['inventory', 'instructions']),
    fileId: z.string(),
});

export async function saveStaticDocumentLinksAction(input: z.infer<typeof saveLinkSchema>) {
    const validation = saveLinkSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Invalid input." };
    }
    const { fileType, fileId } = validation.data;
    try {
        const docRef = doc(db, 'static_documents', fileType);
        
        await setDoc(docRef, { fileId, type: fileType });
        return { success: true, message: "File ID saved successfully." };
    } catch (error: any) {
        console.error("Error saving static document link:", error);
        return { success: false, error: `An unexpected error occurred: ${error.message}` };
    }
}


// Action to get status of static files
export async function getStaticFilesStatusAction() {
    try {
        const statuses: Record<string, {fileId: string} | null> = {
            inventory: null,
            instructions: null,
        };
        const fileTypes = ['inventory', 'instructions'];

        for (const type of fileTypes) {
            const docRef = doc(db, 'static_documents', type);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                statuses[type] = {
                    fileId: data.fileId,
                };
            }
        }
        return { success: true, data: statuses };

    } catch (error: any) {
        console.error("Error getting static file status:", error);
        return { success: false, error: `An unexpected error occurred: ${error.message}` };
    }
}

// Action for PV Generation
export async function generateProcesVerbalAction(recipientIds: string[]) {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
        return { success: false, message: "Invalid input for PV generation." };
    }

    try {
        const recipientsToProcess = [];
        for (const id of recipientIds) {
            const docRef = doc(db, "recipients", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                recipientsToProcess.push({ id: docSnap.id, name: data.name, shipmentId: data.shipmentId });
            } else {
                console.warn(`Recipient with ID ${id} not found.`);
            }
        }

        const result = await generateProcesVerbal({ recipients: recipientsToProcess });
        return result;
    } catch (error: any) {
        console.error("Error in generateProcesVerbal flow:", error);
        return { success: false, message: `Failed to start PV generation due to a server error: ${error.message}` };
    }
}
