
'use server';

/**
 * @fileOverview A flow for handling static document uploads securely on the server.
 * 
 * - uploadStaticFile - A function that uploads a file to Firebase Storage and updates Firestore.
 * - UploadStaticFileInput - The input type for the function.
 * - UploadStaticFileOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adminApp } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const UploadStaticFileInputSchema = z.object({
  fileDataUri: z.string().describe("The file content as a Base64 encoded data URI."),
  fileName: z.string().describe("The name of the file."),
  fileType: z.string().describe("The type of the file (e.g., 'inventory', 'instructions')."),
  contentType: z.string().describe("The MIME type of the file (e.g., 'application/pdf')."),
});
export type UploadStaticFileInput = z.infer<typeof UploadStaticFileInputSchema>;

const UploadStaticFileOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
});
export type UploadStaticFileOutput = z.infer<typeof UploadStaticFileOutputSchema>;

export async function uploadStaticFile(input: UploadStaticFileInput): Promise<UploadStaticFileOutput> {
  return uploadStaticFileFlow(input);
}

const uploadStaticFileFlow = ai.defineFlow(
  {
    name: 'uploadStaticFileFlow',
    inputSchema: UploadStaticFileInputSchema,
    outputSchema: UploadStaticFileOutputSchema,
  },
  async ({ fileDataUri, fileName, fileType, contentType }) => {
    try {
        const bucket = adminApp.storage().bucket();
        const filePath = `static/${fileType}/${fileName}`;
        const storageFile = bucket.file(filePath);

        // Extract the Base64 part of the data URI
        const base64EncodedString = fileDataUri.split(',')[1];
        if (!base64EncodedString) {
            throw new Error('Invalid data URI format.');
        }
        const fileBuffer = Buffer.from(base64EncodedString, 'base64');
        
        await storageFile.save(fileBuffer, {
            metadata: { contentType },
        });
        
        await storageFile.makePublic();
        const publicUrl = storageFile.publicUrl();

        // Save the file path to Firestore
        const docRef = doc(db, 'static_documents', fileType);
        await setDoc(docRef, { 
            path: filePath, 
            name: fileName, 
            uploadedAt: serverTimestamp(),
            url: publicUrl 
        });

        return { 
            success: true, 
            message: `${fileName} uploaded successfully.`,
            url: publicUrl,
        };

    } catch (error: any) {
        console.error('Upload failed in flow:', error);
        return { 
            success: false, 
            error: `Upload failed: ${error.message}` 
        };
    }
  }
);
