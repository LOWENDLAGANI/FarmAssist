/**
 * AuthProvider.tsx
 * ─────────────────────────────────────────────────────────────────
 * React Context provider for Firebase Authentication.
 * Tracks user state, provides sign-in/sign-up/sign-out/reset-password methods.
 * Supports Google OAuth and Email/Password authentication.
 *
 * 🚪 INVITE-CODE GATE:
 * Registration is invite-only. Email/password accounts are created
 * server-side by the `registerWithInvite` callable (which validates the
 * single shared invite code before creating anything), and Google
 * accounts must verify the code through the unclosable `InviteCodeGate`
 * popup — until `users/{uid}/verified` is `true`, the app is blocked.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth";
import { onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, app, userVerifiedRef } from "@/lib/firebaseConfig";
import { ADMIN_UID } from "@/lib/adminConfig";
import InviteCodeGate from "./InviteCodeGate";

interface AuthContextValue {
  /** Current Firebase user, or null if not signed in. */
  user: User | null;
  /** Whether Firebase is still checking auth state. */
  loading: boolean;
  /**
   * Invite-gate state:
   *  • true   — verified, the app is unlocked
   *  • false  — NOT verified, the invite-code popup blocks the app
   *  • null   — still checking (shown as a loading gate)
   */
  verified: boolean | null;
  /** Sign in with Google popup. */
  signInWithGoogle: () => Promise<void>;
  /** Sign in with email and password. */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /**
   * Register a new account with email, password, display name, and the
   * shared invite code. The account is created server-side and only
   * exists if the invite code is valid.
   */
  registerWithEmail: (
    email: string,
    password: string,
    displayName: string,
    inviteCode: string
  ) => Promise<void>;
  /**
   * Verify the invite code for the currently signed-in account
   * (the Google sign-up popup flow). Marks the user verified on success.
   */
  verifyInviteCode: (inviteCode: string) => Promise<void>;
  /** Send a password reset email. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sign out. */
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  verified: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  registerWithEmail: async () => {},
  verifyInviteCode: async () => {},
  sendPasswordReset: async () => {},
  logOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Track invite-verification state for the current user.
  // The admin account is always verified; everyone else is blocked by
  // the invite-code popup until users/{uid}/verified is true.
  useEffect(() => {
    if (!user) {
      setVerified(null);
      return;
    }
    if (user.uid === ADMIN_UID) {
      setVerified(true);
      return;
    }
    const ref = userVerifiedRef(user.uid);
    setVerified(null); // re-checking — keep the loading gate up
    const unsubscribe = onValue(ref, (snapshot) => {
      setVerified(snapshot.val() === true);
    });
    return () => unsubscribe();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = useCallback(
    async (email: string, password: string, displayName: string, inviteCode: string) => {
      // Cloud Functions are deployed in Singapore; the SDK otherwise
      // defaults to us-central1 and cannot find the callable.
      const functions = getFunctions(app, "asia-southeast1");
      const callable = httpsCallable<
        { email: string; password: string; displayName: string; inviteCode: string },
        { uid: string }
      >(functions, "registerWithInvite");
      await callable({ email, password, displayName, inviteCode });
      // The account now exists (server-verified) — sign in to start a session.
      await signInWithEmailAndPassword(auth, email, password);
    },
    []
  );

  const verifyInviteCode = useCallback(async (inviteCode: string) => {
    const functions = getFunctions(app, "asia-southeast1");
    const callable = httpsCallable<{ inviteCode: string }, { verified: boolean }>(
      functions,
      "verifyInviteCode"
    );
    await callable({ inviteCode });
    // Unlock immediately; the DB listener will confirm the persisted flag.
    setVerified(true);
  }, []);

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
        verified,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        verifyInviteCode,
        sendPasswordReset,
        logOut,
      }}
    >
      {children}
      {/* Unclosable invite-code gate — blocks the whole app until the
          signed-in account is verified (see InviteCodeGate.tsx). */}
      {user && verified !== true && <InviteCodeGate checking={verified === null} />}
    </AuthContext.Provider>
  );
}