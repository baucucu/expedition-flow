
import { task, logger } from "@trigger.dev/sdk";
import * as admin from 'firebase-admin';
import { getStorage } from "firebase-admin/storage";
import type { Recipient } from "@/types";
import serviceAccount from '../../..//expeditionflow-firebase-adminsdk-fbsvc-1406ca54d0.json';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccountCredential),
    storageBucket: `${serviceAccount.project_id}.appspot.com`
  });
}

const adminDb = admin.firestore();
const storage = getStorage();
const bucket = storage.bucket();


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

const sanitizeFilename = (name?: string): string => {
  if (typeof name !== "string") return "unknown";
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
};


const processSingleFile = task({
    id: "process-single-pv-semnat-file",
    queue: {
      concurrencyLimit: 10, // Allow up to 10 files to be processed in parallel
    },
    run: async (payload: { docId: string }, { ctx }) => {
        const { docId } = payload;
        const recipientRef = adminDb.collection("recipients").doc(docId);
        const docSnap = await recipientRef.get();

        if (!docSnap.exists) {
            logger.warn("Recipient document not found, skipping.", { docId });
            return { success: false, message: `Recipient ${docId} not found.`};
        }

        const recipient = docSnap.data() as Recipient;

        if (!recipient.pvSemnatUrl) {
            logger.info("Recipient has no pvSemnatUrl, skipping.", { docId });
            return { success: true, message: "No URL to process."};
        }
        
        const oldPath = getPathFromUrl(recipient.pvSemnatUrl);

        if (!oldPath) {
            logger.warn("Could not determine old file path for recipient.", { docId });
            return { success: false, message: `Invalid pvSemnatUrl for ${docId}` };
        }

        const oldFile = bucket.file(oldPath);
        const [exists] = await oldFile.exists();

        if (!exists) {
            logger.warn("File does not exist in storage, skipping.", { docId, path: oldPath });
            return { success: true, message: `File ${oldPath} not found in storage.`};
        }

        try {
            const metadata = await oldFile.getMetadata();
            const contentType = metadata[0].contentType || 'image/jpeg';
            let extension = contentType.split('/')[1] || 'jpg';
            
            // Construct the new filename
            const recipientName = sanitizeFilename(recipient?.name ?? 'unknown');
            const groupName = sanitizeFilename(recipient?.group ?? 'nogroup');
            const newFilename = `${recipientName}_${groupName}_${recipient.id}_${recipient.shipmentId}.${extension}`;
            const newPath = `pv_semnate/${newFilename}`;

            // Check if file has already been renamed
            if (oldPath === newPath) {
                 logger.info("File already appears to be renamed, skipping.", { docId, path: oldPath });
                 return { success: true, message: "File already renamed." };
            }

            logger.info(`Processing recipient ${docId}: Renaming ${oldPath} to ${newPath}`);

            await oldFile.move(newPath);

            const newFile = bucket.file(newPath);
            const [newUrl] = await newFile.getSignedUrl({
                action: 'read',
                expires: '03-09-2491'
            });
            
            await recipientRef.update({
              pvSemnatUrl: newUrl
            });

            logger.info(`Successfully renamed and updated for recipient ${docId}`);
            return { success: true, docId };

        } catch (error: any) {
            logger.error("Failed to process recipient", { docId, error: error.message });
            return { success: false, message: `Failed for ${docId}: ${error.message}`};
        }
    }
});


export const renamePvSemnatFiles = task({
  id: "rename-pv-semnat-files",
  run: async (payload: any, { ctx }) => {
    logger.info("Starting task to queue renaming for all PV Semnat files.");

    const recipientsRef = adminDb.collection("recipients");
    const snapshot = await recipientsRef.where("pvSemnatUrl", ">", "").get();

    if (snapshot.empty) {
      logger.info("No recipients with pvSemnatUrl found. Nothing to do.");
      return { success: true, message: "No files to rename.", queued: 0 };
    }

    const events = snapshot.docs.map(doc => ({
        payload: { docId: doc.id }
    }));

    logger.info(`Found ${events.length} recipients to process. Batching worker jobs...`);

    const runs = await processSingleFile.batchTrigger(events);

    const summary = `Successfully queued ${events.length} file renaming jobs.`;
    logger.info(summary);
    return { success: true, message: summary, queued: events.length };
  },
});
