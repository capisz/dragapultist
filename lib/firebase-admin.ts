import { applicationDefault, cert, getApps, initializeApp, type AppOptions } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"

function adminOptions(): AppOptions {
  const projectId = process.env.FIREBASE_PROJECT_ID
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required.")

  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return { projectId }
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson)
    return { credential: cert(serviceAccount), projectId }
  }

  return { credential: applicationDefault(), projectId }
}

let cachedAuth: Auth | undefined

export function getFirebaseAdminAuth(): Auth {
  if (!cachedAuth) {
    const firebaseAdminApp = getApps()[0] ?? initializeApp(adminOptions())
    cachedAuth = getAuth(firebaseAdminApp)
  }
  return cachedAuth
}

// Retains the existing call surface while deferring configuration and credentials
// until an authentication operation actually runs.
export const firebaseAdminAuth = new Proxy({} as Auth, {
  get(_target, property) {
    const auth = getFirebaseAdminAuth() as unknown as Record<PropertyKey, unknown>
    const value = auth[property]
    return typeof value === "function" ? value.bind(auth) : value
  },
})
