
import * as admin from 'firebase-admin';

// This configuration uses a service account to authenticate the Firebase Admin SDK.
// It's a more explicit and reliable method, especially in environments where
// Application Default Credentials might not be configured correctly.

if (!admin.apps.length) {
    const serviceAccount: admin.ServiceAccount = {
        projectId: process.env.PROJECT_ID,
        privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.CLIENT_EMAIL,
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'expeditionflow.appspot.com'
    });
}

const adminApp = admin;

export { adminApp };
