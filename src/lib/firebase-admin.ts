
import * as admin from 'firebase-admin';

// This is the recommended approach for initializing the Admin SDK in a Next.js server environment.
// It ensures that the SDK is initialized only once.
// By calling initializeApp() without arguments, the SDK will use Application Default Credentials.
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: 'expeditionflow.appspot.com'
  });
}

const adminApp = admin;

export { adminApp };
