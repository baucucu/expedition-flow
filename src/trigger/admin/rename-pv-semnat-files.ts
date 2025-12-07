
import { task, logger } from "@trigger.dev/sdk";
import * as admin from 'firebase-admin';
import { getStorage } from "firebase-admin/storage";
import type { Recipient } from "@/types";

console.log("🔥 Starting Firebase Admin initialization");

const serviceAccount = {
  "type": "service_account",
  "project_id": "expeditionflow",
  "private_key_id": "1406ca54d065f0577fb690e812880e460937937f",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCGSeN2ewP52bK4\nu7Trp46rf4e4oA96wxzTwRyBOFxSh3pxKtcamttLSEUuB0DBU6ncg3tcttfzNKyC\ntTj/GJDKGXO/aoEc/Sel1DOvPHQvOc+U8xSUBtEA1XungUHYnH9AakNLS6gZsKKg\n6wsI1RwtqB3lw8W5UBZ6pka2JoVIjKHwTGHa20hGkNokc+Y9KaiwXuH4TnHjAncr\nyQP66N6DaYBNTvRhBoLorJ+URhAFQeNwvREhkf26pAuWtN72sDprbhL+QoaiHIoA\nanFwt6EfV6OZ82vSklEC4xlbjs1WJ40N4MoqxCtAvh0mjT+VMMyOC5ghUXJEXhRF\nlHm/ONsvAgMBAAECggEAOM+ahL2/LVzNcLysagOdZm1R8Cf61H8lu2nXks1StXFu\nOeEbVjyMKJme9r2HxiIMWude8ZbC3jd7AeMEBVuRqYZCAwleLPLmao/O+8QSDQai\njIuXuZX2pqkqIm+a+TYf2ZL6/Cg6KgAhlP1K0kZCIQid+V2s0NySXfnpMVczjMCh\nPXIEHOCOYcWw6DueWWIv2p7t33qCk7dOfvxZTJk64Y2bPcW7Y5K6J3cDiPX2R1UQ\nmVHygIFd8Ge5zvM3KIZr3eJ3ERU/X6QK4x39bWqAPs6ruGWk1m+3m1HzplJTD3v5\naq333/Vhyurtm1OapkJYJAwuWFPEaP9qZyfrfkdr8QKBgQC8VaIm0bDAdpPGAi5I\n9jrCEyKHRDkq/xivdjhn8SAFwmcj5AO6u0ALh32qT/x7LrQj7IrszGeitoP+83Dd\nvEPVISZ6Umknq9+eeDWXzAnZQYlPxa2fkeU00YrxEsPCtgowWPTsf9jdBTZcX4Yr\n4wEMZsExEM2L3kIO0kpsGknmMQKBgQC2iUyah0PKZ7hSFf70hyHueA4RREI+MenJ\nklmnifPqfRfeDur03YVMtww0IecA72XF2NCR4ezE+KH6vxhGRx5bLUGQFEVlsavz\nfo8HDJ1w1sjl4dLp/O0BNAfeajDERzJrddJOsbCBUD0cNWf2hkJAJvSMChxgtzB5\nYR1w3BSfXwKBgBECbu2wnJUVYI1Onx2J1461qbWrzLn8Zh9avwdsOKcsgqI0Mr4H\nsWYZK5lZNgVuF2jzMSzn3ShN8afyFqyAF2RFZTNBBCxIEp8+XiDCldUgXSVuRhsW\nUywtDK5vMm0AgfUR47UEavKzSNCY9AY8r1iOYz5qNRY/0ZmDFqOi0C/RAoGABS7u\n6vBuX2AEnuga/kycDQ6Br8HVc7itH9k1DInhUEZPGDIqP9vOfjgwc4aG7cLei/i1\nK39T3uAEkX89rDk2xnYJh5LbyaB69oYgf52/FsYynDyGZbiV7lPQ6WLwkZJH/z8w\nQqXPEkz5/0QQ+LIlTXcNuLBMz/5DtR6p3FuThlcCgYB1rcd3OBOgapdWsQVoAgNM\nX7Alk796GVXpfbuVptyWM++W925f+/+DncdR07isuJleFLJIJ7I2pe7i5IL5cH8d\nRTwOV6VXUozTuXidSb6JX8DAooCrI7SmRJD2zpEe2vqXKK8CB2hs5zn1o0xjOaGe\nG0Qbb0ns/3Ju6dziG1MLvg==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@expeditionflow.iam.gserviceaccount.com",
  "client_id": "111537482540648081022",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40expeditionflow.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}

let app: admin.app.App;

try {
  console.log("Checking if Firebase app already initialized...");
  if (!admin.apps.length) {
    console.log("No Firebase apps found. Initializing new Firebase Admin instance...");
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`,
    });
    console.log("✅ Firebase Admin initialized successfully");
  } else {
    console.log("Firebase already initialized, reusing existing instance...");
    app = admin.app();
  }
} catch (err: any) {
  console.error("❌ Error initializing Firebase Admin SDK:", err.message);
  throw err;
}

const adminDb = admin.firestore();
const storage = getStorage();
const bucket = storage.bucket();

console.log("✅ Firestore and Storage initialized.");
console.log("Bucket name:", bucket.name);

// ---------------------
// HELPER FUNCTIONS
// ---------------------

const getPathFromUrl = (url: string): string | null => {
  console.log("Extracting path from URL:", url);
  try {
    const urlObject = new URL(url);
    const path = decodeURIComponent(urlObject.pathname.split("/o/")[1].split("?")[0]);
    console.log("✅ Extracted path:", path);
    return path;
  } catch (e) {
    console.error("❌ Could not parse URL to get file path", { url, error: e });
    return null;
  }
};

const sanitizeFilename = (name?: string): string => {
  const result = typeof name === "string" ? name.replace(/[^a-zA-Z0-9_.-]/g, "_") : "unknown";
  console.log("Sanitized filename:", result);
  return result;
};

// ---------------------
// PROCESS SINGLE FILE TASK
// ---------------------

const processSingleFile = task({
  id: "process-single-pv-semnat-file",
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload: { docId: string }, { ctx }) => {
    console.log("Running processSingleFile for:", payload.docId);

    try {
      const { docId } = payload;
      const recipientRef = adminDb.collection("recipients").doc(docId);

      console.log("Fetching recipient document...");
      const docSnap = await recipientRef.get();

      if (!docSnap.exists) {
        console.warn("Recipient document not found", { docId });
        return { success: false, message: `Recipient ${docId} not found.` };
      }

      const recipient = docSnap.data() as Recipient;
      console.log("Recipient data fetched:", recipient);

      if (!recipient.pvSemnatUrl) {
        console.log("No pvSemnatUrl found for recipient, skipping.");
        return { success: true, message: "No URL to process." };
      }

      const oldPath = getPathFromUrl(recipient.pvSemnatUrl);

      if (!oldPath) {
        console.warn("Invalid pvSemnatUrl for recipient", { docId });
        return { success: false, message: `Invalid pvSemnatUrl for ${docId}` };
      }

      console.log("Checking if file exists at:", oldPath);
      const oldFile = bucket.file(oldPath);
      const [exists] = await oldFile.exists();
      console.log("File exists?", exists);

      if (!exists) {
        console.warn("File missing in storage:", oldPath);
        return { success: true, message: `File ${oldPath} not found in storage.` };
      }

      console.log("Fetching file metadata...");
      const metadata = await oldFile.getMetadata();
      console.log("File metadata fetched:", metadata[0]);

      const contentType = metadata[0].contentType || "image/jpeg";
      const extension = contentType.split("/")[1] || "jpg";

      const recipientName = sanitizeFilename(recipient?.name ?? "unknown");
      const groupName = sanitizeFilename(recipient?.group ?? "nogroup");
      const newFilename = `${recipientName}_${groupName}_${recipient.id}_${recipient.shipmentId}.${extension}`;
      const newPath = `pv_semnate/${newFilename}`;

      console.log("New filename will be:", newFilename);

      if (oldPath === newPath) {
        console.log("File already renamed, skipping:", newPath);
        return { success: true, message: "File already renamed." };
      }

      console.log(`Moving file from ${oldPath} → ${newPath}`);
      await oldFile.move(newPath);
      console.log("✅ File moved successfully");

      const newFile = bucket.file(newPath);
      console.log("Generating signed URL for new file...");
      const [newUrl] = await newFile.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      console.log("New signed URL:", newUrl);

      await recipientRef.update({ pvSemnatUrl: newUrl });
      console.log("✅ Firestore document updated successfully for:", docId);

      return { success: true, docId };
    } catch (error: any) {
      console.error("❌ Error in processSingleFile:", error.message, error);
      return { success: false, message: error.message };
    }
  },
});

// ---------------------
// MAIN BATCH TASK
// ---------------------

export const renamePvSemnatFiles = task({
  id: "rename-pv-semnat-files",
  run: async (payload: any, { ctx }) => {
    console.log("🚀 Starting renamePvSemnatFiles task...");

    try {
      const recipientsRef = adminDb.collection("recipients");
      console.log("Fetching all recipients with pvSemnatUrl...");

      const snapshot = await recipientsRef.where("pvSemnatUrl", ">", "").get();
      console.log("Recipient snapshot fetched. Count:", snapshot.size);

      if (snapshot.empty) {
        console.log("No recipients with pvSemnatUrl found.");
        return { success: true, message: "No files to rename.", queued: 0 };
      }

      const events = snapshot.docs.map((doc) => ({
        payload: { docId: doc.id },
      }));

      console.log(`Queuing ${events.length} file rename jobs...`);
      const runs = await processSingleFile.batchTrigger(events);

      console.log("✅ Batch trigger complete.");
      return {
        success: true,
        message: `Queued ${events.length} file renaming jobs.`,
        queued: events.length,
      };
    } catch (error: any) {
      console.error("❌ Error in renamePvSemnatFiles:", error.message, error);
      return { success: false, message: error.message };
    }
  },
});