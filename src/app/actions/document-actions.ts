
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
            return { success: false, error: 'No static file links have been saved. Nothing to sync.' };
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

// Action to save a static file link
const saveLinkSchema = z.object({
    fileType: z.enum(['inventory', 'instructions']),
    url: z.string().url(),
});
export async function saveStaticDocumentLinksAction(input: z.infer<typeof saveLinkSchema>) {
    const validation = saveLinkSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Invalid input." };
    }
    const { fileType, url } = validation.data;
    try {
        const docRef = doc(db, 'static_documents', fileType);
        
        // Extract file name from URL for display purposes
        let fileName = "Google Drive File";
        try {
            const urlObject = new URL(url);
            // This is a basic way to get a name, might not be perfect for all link types
            const pathParts = urlObject.pathname.split('/');
            const docId = pathParts.find(part => part.length > 20); // Heuristic to find doc ID
            fileName = docId ? `Doc...${docId.slice(-6)}` : "Google Drive File";
        } catch {}


        await setDoc(docRef, { name: fileName, url: url, type: fileType });
        return { success: true, message: "Link saved successfully." };
    } catch (error: any) {
        console.error("Error saving static document link:", error);
        return { success: false, error: `An unexpected error occurred: ${error.message}` };
    }
}

// Action to get status of static files
export async function getStaticFilesStatusAction() {
    try {
        const statuses: Record<string, {name: string, url: string} | null> = {
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
                    name: data.name || 'Saved Link',
                    url: data.url,
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
