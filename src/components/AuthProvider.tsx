/**
 * AuthProvider.tsx
 * ─────────────────────────────────────────────────────────────────
 * React Context provider for Firebase Authentication.
 * Tracks user state, provides sign-in/sign-up/sign-out/reset-password methods.
 * Supports Google OAuth and Email/Password authentication.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

interface AuthContextValue {
  /** Current Firebase user, or null if not signed in. */
  user: User | null;
  /** Whether Firebase is still checking auth state. */
  loading: boolean;
  /** Sign in with Google popup. */
  signInWithGoogle: () => Promise<void>;
  /** Sign in with email and password. */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Register a new account with email, password, and display name. */
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  /** Send a password reset email. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sign out. */
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  registerWithEmail: async () => {},
  sendPasswordReset: async () => {},
  logOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
      await credential.user.reload();
      setUser({ ...credential.user });
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
