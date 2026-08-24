/**
 * AuthProvider.tsx
 * ─────────────────────────────────────────────────────────────────
 * React Context provider for Firebase Authentication.
 * Tracks user state, provides sign-in/sign-out methods.
 * Also supports guest mode for presentations.
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
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useGuestMode } from "@/hooks/useGuestMode";
import type { SensorTelemetry, SensorKey, ChartDataPoint, ConnectionStatus } from "@/types/telemetry";

/** Mock guest user object for demo mode */
const GUEST_USER = {
  uid: "guest-demo-user-001",
  displayName: "Demo User",
  email: "demo@farmassist.app",
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as User["metadata"],
  providerData: [],
  reload: async () => {},
  delete: async () => {},
  getIdToken: async () => "guest-token",
  getIdTokenResult: async () => ({ token: "guest-token", claims: {}, signInSecondFactor: null, authenticationTime: 0, issuedAtTime: 0, expirationTime: 0, signInProvider: "guest", fullClaims: {} }),
  phoneNumber: null,
  tenantId: null,
} as unknown as User;

interface AuthContextValue {
  /** Current Firebase user, or null if not signed in. */
  user: User | null;
  /** Whether Firebase is still checking auth state. */
  loading: boolean;
  /** Whether guest mode is active. */
  isGuest: boolean;
  /** Sign in with Google popup. */
  signInWithGoogle: () => Promise<void>;
  /** Sign in as guest for demo. */
  signInAsGuest: () => void;
  /** Sign out (also exits guest mode). */
  logOut: () => Promise<void>;
  /** Guest mode telemetry data. */
  guestLatest: SensorTelemetry | null;
  guestChartHistory: ChartDataPoint[];
  guestStatus: ConnectionStatus;
  guestLastUpdated: number | null;
  guestDeviceId: string;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isGuest: false,
  signInWithGoogle: async () => {},
  signInAsGuest: () => {},
  logOut: async () => {},
  guestLatest: null,
  guestChartHistory: [],
  guestStatus: "offline",
  guestLastUpdated: null,
  guestDeviceId: "demo-farm-001",
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const {
    isActive: guestActive,
    latest: guestLatest,
    chartHistory: guestChartHistory,
    status: guestStatus,
    lastUpdated: guestLastUpdated,
    deviceId: guestDeviceId,
    activateGuestMode,
    deactivateGuestMode,
  } = useGuestMode();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Only update if not in guest mode
      if (!isGuest) {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isGuest]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    await signInWithPopup(auth, provider);
    setIsGuest(false);
    deactivateGuestMode();
  };

  const signInAsGuest = () => {
    setUser(GUEST_USER);
    setIsGuest(true);
    activateGuestMode();
  };

  const logOut = async () => {
    if (isGuest) {
      deactivateGuestMode();
      setIsGuest(false);
      setUser(null);
    } else {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        signInWithGoogle,
        signInAsGuest,
        logOut,
        guestLatest,
        guestChartHistory,
        guestStatus,
        guestLastUpdated,
        guestDeviceId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
