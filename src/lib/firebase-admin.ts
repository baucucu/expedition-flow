
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let adminApp: admin.app.App;

if (admin.apps.length > 0) {
  adminApp = admin.app();
} else {
  const serviceAccountPath = path.resolve(process.cwd(), 'expeditionflow-firebase-adminsdk.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'expeditionflow.appspot.com',
    });
  } else {
    console.error("CRITICAL: Firebase Admin initialization failed. Service account key file not found at", serviceAccountPath);
    // In a real app, you might want to throw an error to prevent the server from starting.
    // For this environment, we'll log the error. The action will fail gracefully.
    // @ts-ignore
    adminApp = undefined;
  }
}

export { adminApp };
