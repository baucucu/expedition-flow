
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp, getDocs, query, getDoc, setDoc } from "firebase/firestore";
import { adminApp } from "@/lib/firebase-admin";
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
