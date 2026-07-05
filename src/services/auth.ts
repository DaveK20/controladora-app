import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { auth } from '@/lib/firebaseConfig';

export type { User } from 'firebase/auth';
export { auth, onAuthStateChanged };

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
