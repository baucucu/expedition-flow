
import { task, logger } from "@trigger.dev/sdk";
import { adminDb } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";
import type { Recipient } from "@/types";

// Initialize Firebase Admin Storage
const storage = getStorage();
const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

// This helper function extracts the file path from the full GCS URL.
const getPathFromUrl = (url: string): string | null => {
    try {
        const urlObject = new URL(url);
        // The path is usually after '/v0/b/bucket-name/o/' and before the '?alt=media' token.
        // The path is URL-encoded, so we need to decode it.
        const path = decodeURIComponent(urlObject.pathname.split('/o/')[1].split('?')[0]);
        return path;
    } catch (e) {
        logger.error("Could not parse URL to get file path", { url, error: e });
        return null;
    }
};

const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
};


export const renamePvSemnatFiles = task({
  id: "rename-pv-semnat-files",
  queue: {
    concurrencyLimit: 1, // Run one at a time to be safe
  },
  run: async (payload: any, { ctx }) => {
    logger.info("Starting task to rename all PV Semnat files.");

    const recipientsRef = adminDb.collection("recipients");
    const snapshot = await recipientsRef.where("pvSemnatUrl", ">", "").get();

    if (snapshot.empty) {
      logger.info("No recipients with pvSemnatUrl found. Nothing to do.");
      return { success: true, message: "No files to rename." };
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    logger.info(`Found ${snapshot.docs.length} recipients to process.`);

    for (const doc of snapshot.docs) {
      const recipient = doc.data() as Recipient;
      const docId = doc.id;

      if (!recipient.pvSemnatUrl) {
        continue;
      }
      
      const oldPath = getPathFromUrl(recipient.pvSemnatUrl);

      if (!oldPath) {
        logger.warn("Could not determine old file path for recipient.", { docId });
        errorCount++;
        errors.push(`Recipient ${docId}: Invalid pvSemnatUrl.`);
        continue;
      }

      const oldFile = bucket.file(oldPath);
      const [exists] = await oldFile.exists();

      if (!exists) {
        logger.warn("File does not exist in storage, skipping.", { docId, path: oldPath });
        // We don't count this as an error, it's just a data inconsistency.
        continue;
      }

      try {
        const metadata = await oldFile.getMetadata();
        const contentType = metadata[0].contentType || 'image/jpeg';
        let extension = contentType.split('/')[1] || 'jpg';
        
        // Construct the new filename
        const recipientName = sanitizeFilename(recipient.name || 'unknown');
        const groupName = sanitizeFilename(recipient.group || 'nogroup');
        const newFilename = `${recipientName}_${groupName}_${recipient.id}_${recipient.shipmentId}.${extension}`;
        const newPath = `pv_semnate/${newFilename}`;

        logger.info(`Processing recipient ${docId}: Renaming ${oldPath} to ${newPath}`);

        // Rename (move) the file in storage
        await oldFile.move(newPath);

        const newFile = bucket.file(newPath);
        const [newUrl] = await newFile.getSignedUrl({
            action: 'read',
            expires: '03-09-2491' // A very long time in the future
        });
        
        // Update the Firestore document with the new URL
        await adminDb.collection("recipients").doc(docId).update({
          pvSemnatUrl: newUrl
        });

        logger.info(`Successfully renamed and updated for recipient ${docId}`);
        successCount++;

      } catch (error: any) {
        logger.error("Failed to process recipient", { docId, error: error.message });
        errorCount++;
        errors.push(`Recipient ${docId}: ${error.message}`);
      }
    }

    const summary = `Process complete. Success: ${successCount}, Failed: ${errorCount}.`;
    logger.info(summary, { errors });
    return { success: errorCount === 0, message: summary, errors: errors };
  },
});
