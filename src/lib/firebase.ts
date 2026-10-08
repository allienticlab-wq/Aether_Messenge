import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  ConfirmationResult,
  User,
  UserCredential,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "cohesive-photon-510805-h5",
  appId: "1:353612644607:web:692912c2929e11617e0cca",
  apiKey: "AIzaSyBdFUCEFb2kdrT0KD-hoq5BU1IuRAB4Utg",
  authDomain: "cohesive-photon-510805-h5.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-aethermessenger-2e8f77a1-9287-4891-8ca4-88915c4d2614",
  storageBucket: "cohesive-photon-510805-h5.firebasestorage.app",
  messagingSenderId: "353612644607",
  measurementId: "",
  oAuthClientId: "353612644607-0n0dakdecir2amrhd7gk6i4fb9qntl55.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Test connection on boot per Firebase skill guidelines
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline check:', error.message);
    }
  }
}
testFirestoreConnection();

// Global reference for RecaptchaVerifier
let recaptchaVerifierInstance: RecaptchaVerifier | null = null;

/**
 * Initializes or re-initializes the Firebase RecaptchaVerifier for Phone Authentication
 * Follows: https://firebase.google.com/docs/auth/web/phone-auth
 */
export function getOrCreateRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`reCAPTCHA container element #${containerId} not found in DOM`);
  }

  // Clear previous instance if attached to different container or stale
  if (recaptchaVerifierInstance) {
    try {
      recaptchaVerifierInstance.clear();
    } catch {
      // ignore
    }
    recaptchaVerifierInstance = null;
  }

  recaptchaVerifierInstance = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - allow signInWithPhoneNumber
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired. Resetting verifier.');
    },
  });

  return recaptchaVerifierInstance;
}

/**
 * Dispatches Phone OTP SMS using Firebase Auth
 * Supports E.164 phone format (e.g. +14155552671, +919876543210)
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  containerId = 'recaptcha-container'
): Promise<ConfirmationResult> {
  const appVerifier = getOrCreateRecaptchaVerifier(containerId);
  return await signInWithPhoneNumber(firebaseAuth, phoneNumber, appVerifier);
}

/**
 * Verifies the 6-digit OTP code with Firebase ConfirmationResult
 */
export async function verifyFirebasePhoneOtp(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<UserCredential> {
  return await confirmationResult.confirm(code);
}

/**
 * Firebase Email & Password Sign In
 */
export async function signInWithFirebaseEmail(email: string, pass: string): Promise<UserCredential> {
  return await signInWithEmailAndPassword(firebaseAuth, email, pass);
}

/**
 * Firebase Email & Password Registration
 */
export async function signUpWithFirebaseEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<UserCredential> {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
  if (displayName && cred.user) {
    try {
      await updateFirebaseProfile(cred.user, { displayName });
    } catch {
      // non-blocking
    }
  }
  return cred;
}

/**
 * Firebase Password Reset
 */
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  return await sendPasswordResetEmail(firebaseAuth, email);
}

/**
 * Firebase Google Sign-In
 */
export async function signInWithFirebaseGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(firebaseAuth, provider);
}

/**
 * Firebase Sign Out
 */
export async function signOutFirebase(): Promise<void> {
  return await firebaseSignOut(firebaseAuth);
}
