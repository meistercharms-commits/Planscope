"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  linkWithPopup,
} from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase";
import type { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sync session cookie whenever Firebase auth state changes
  const syncSession = useCallback(async () => {
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken(true);
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      } catch {
        // Session sync failed — will retry on next auth state change
      }
    }
  }, []);

  // Fetch user profile from server
  const fetchProfile = useCallback(async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) return await res.json();
    } catch {
      // Profile fetch failed
    }
    return null;
  }, []);

  // Main auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser) => {
        if (firebaseUser) {
          // Sync session cookie
          try {
            const idToken = await firebaseUser.getIdToken();
            await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });
          } catch {
            // Ignore session sync errors
          }

          // Fetch user profile from Firestore via API
          const profile = await fetchProfile();
          setUser(profile);
        } else {
          setUser(null);
          // Clear session cookie
          try {
            await fetch("/api/auth/session", { method: "DELETE" });
          } catch {
            // Ignore
          }
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [fetchProfile]);

  // Refresh session cookie periodically (session cookies last 5 days,
  // but refreshing keeps it alive as long as user is active)
  useEffect(() => {
    const interval = setInterval(async () => {
      await syncSession();
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(interval);
  }, [syncSession]);

  // ─── Auth Actions ───

  async function signup(email: string, password: string) {
    const currentUser = firebaseAuth.currentUser;

    if (currentUser?.isAnonymous) {
      // Link anonymous account to email/password — keeps the same UID
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(currentUser, credential);
    } else {
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
    }

    // Sync session and fetch profile
    await syncSession();
    const profile = await fetchProfile();
    setUser(profile);
    router.push("/dashboard");
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    // onAuthStateChanged will handle the rest
    router.push("/dashboard");
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const currentUser = firebaseAuth.currentUser;

    if (currentUser?.isAnonymous) {
      await linkWithPopup(currentUser, provider);
    } else {
      await signInWithPopup(firebaseAuth, provider);
    }

    router.push("/dashboard");
  }

  async function loginWithApple() {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    const currentUser = firebaseAuth.currentUser;

    if (currentUser?.isAnonymous) {
      await linkWithPopup(currentUser, provider);
    } else {
      await signInWithPopup(firebaseAuth, provider);
    }

    router.push("/dashboard");
  }

  /**
   * Ensure the user is signed in anonymously if not already signed in.
   * This gives them a Firebase UID for creating plans before signup.
   */
  async function ensureAnonymous() {
    if (!firebaseAuth.currentUser) {
      await signInAnonymously(firebaseAuth);
    }
  }

  async function logout() {
    await signOut(firebaseAuth);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // Ignore
    }
    setUser(null);
    router.push("/new-plan");
  }

  async function refreshUser() {
    const profile = await fetchProfile();
    setUser(profile);
  }

  return {
    user,
    loading,
    signup,
    login,
    loginWithGoogle,
    loginWithApple,
    logout,
    ensureAnonymous,
    refreshUser,
  };
}
