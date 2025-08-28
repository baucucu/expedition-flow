
import * as admin from 'firebase-admin';

// This configuration uses a service account to authenticate the Firebase Admin SDK.
// It's a more explicit and reliable method, especially in environments where
// Application Default Credentials might not be configured correctly.

if (!admin.apps.length) {
    
      admin.initializeApp({
        credential: admin.credential.cert("/expeditionflow-firebase-adminsdk-fbsvc-1406ca54d0.json"),
        storageBucket: "expeditionflow.appspot.com",
      });
}

const adminApp = admin;

export { adminApp };
