// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { Storage } from "@google-cloud/storage";
import fs from 'fs';
import path from 'path';

const serviceAccountKeyPath = path.resolve('./service-account-key.json');
const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf8'));

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: serviceAccountKey.project_id, // Use project_id from service account
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Initialize Storage with explicit credentials from the service account file
const storage = new Storage({
  projectId: serviceAccountKey.project_id,
  credentials: {
    client_email: serviceAccountKey.client_email,
    private_key: serviceAccountKey.private_key,
  },
});

export { db, storage };
