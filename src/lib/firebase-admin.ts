
import * as admin from 'firebase-admin';

// This prevents initialization on the client side and during hot reloads in dev.
if (!admin.apps.length) {
    // The service account key is stored in an environment variable for security.
    // In a deployed environment (like Vercel), you would set this environment variable.
    // The `replace` is needed because these environments often escape newlines.
    const serviceAccount = JSON.parse(
        process.env.FIREBASE_ADMIN_SDK_CONFIG!.replace(/\\n/g, '\n')
    );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
