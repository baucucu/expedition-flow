// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "expeditionflow",
  appId: "1:108452888675:web:b799f8079ef451cab53856",
  storageBucket: "expeditionflow.appspot.com",
  apiKey: "AIzaSyB5_ZobHVwtOm1KimHLe4YTaTk46NujgDw",
  authDomain: "expeditionflow.firebaseapp.com",
  messagingSenderId: "108452888675",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
