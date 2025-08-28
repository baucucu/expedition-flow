
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
import { serverTimestamp, collection, addDoc } from "firebase/firestore";

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

      // Normalize filename
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `static/${fileType}/${safeFileName}`;
      const storageFile = bucket.file(filePath);

      // Extract Base64 data
      const base64EncodedString = fileDataUri.split(',')[1];
      if (!base64EncodedString) throw new Error('Invalid data URI format.');

      const fileBuffer = Buffer.from(base64EncodedString, 'base64');

      await storageFile.save(fileBuffer, { metadata: { contentType } });

      // Use signed URL instead of makePublic
      const [signedUrl] = await storageFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      // Save file metadata in Firestore under a collection
      const colRef = collection(db, 'static_documents', fileType, 'files');
      await addDoc(colRef, {
        path: filePath,
        name: safeFileName,
        uploadedAt: serverTimestamp(),
        url: signedUrl,
      });

      return { success: true, message: `${fileName} uploaded successfully.`, url: signedUrl };

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Upload failed in flow:", err);
      return { success: false, error: `Upload failed: ${message}` };
    }
  }
);

