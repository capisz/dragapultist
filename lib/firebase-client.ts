"use client"

import { getApp, getApps, initializeApp } from "firebase/app"
import { connectAuthEmulator, getAuth, inMemoryPersistence, setPersistence } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let configured = false

export function getFirebaseClientAuth() {
  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (!value) throw new Error(`Missing Firebase client configuration: ${key}`)
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  const auth = getAuth(app)

  if (!configured) {
    void setPersistence(auth, inMemoryPersistence)
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH_EMULATOR === "true") {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })
    }
    configured = true
  }

  return auth
}
