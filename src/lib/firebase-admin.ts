
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// This is the recommended approach for initializing the Admin SDK in a Next.js server environment.
// It ensures that the SDK is initialized only once.
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(process.cwd(), 'expeditionflow-firebase-adminsdk.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'expeditionflow.appspot.com'
    });
  } else {
    // In a real app, you might want to throw an error or handle this differently.
    // For now, we'll log the error. The app will likely fail on storage operations.
    console.error(`CRITICAL: Firebase Admin initialization failed. Service account key file not found at ${serviceAccountPath}`);
  }
}

const adminApp = admin;

export { adminApp };
