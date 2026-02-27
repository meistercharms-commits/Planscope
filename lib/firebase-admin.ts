import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Missing Firebase env vars: ${[
        !projectId && "FIREBASE_PROJECT_ID",
        !clientEmail && "FIREBASE_CLIENT_EMAIL",
        !privateKey && "FIREBASE_PRIVATE_KEY",
      ].filter(Boolean).join(", ")}`
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = getAuth();
export const db = getFirestore();
