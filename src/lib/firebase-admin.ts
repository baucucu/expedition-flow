
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'expeditionflow.appspot.com',
    });
  } else {
    // Initialize without credentials in environments where they might not be available
    // (like client-side rendering, though this file should be server-only)
    // The Admin SDK will try to autodiscover credentials in a GCP environment.
    admin.initializeApp({
        storageBucket: 'expeditionflow.appspot.com',
    });
  }
}

export const adminApp = admin.apps[0]!;
