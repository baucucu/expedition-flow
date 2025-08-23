
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const initializeAdminApp = (): admin.app.App => {
  if (admin.apps.length > 0) {
    // If the app is already initialized, return the existing instance.
    return admin.app();
  }

  const serviceAccountPath = path.resolve(process.cwd(), 'expeditionflow-firebase-adminsdk.json');

  if (!fs.existsSync(serviceAccountPath)) {
    // If the service account file doesn't exist, throw a clear error.
    // This stops the server and prevents cryptic runtime errors.
    const errorMessage = `CRITICAL: Firebase Admin initialization failed. Service account key file not found at ${serviceAccountPath}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  // Initialize the app with the service account credentials.
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'expeditionflow.appspot.com',
  });
};

// Call the function to get the initialized app instance.
const adminApp = initializeAdminApp();

export { adminApp };
