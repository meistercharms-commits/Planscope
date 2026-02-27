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
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser) => {
        if (firebaseUser) {
          // Sync session cookie
          try {
            const idToken = await firebaseUser.getIdToken();
            const sessionRes = await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });
            if (!sessionRes.ok) {
              const errData = await sessionRes.json().catch(() => ({}));
              console.error("[Auth] Session sync failed:", sessionRes.status, errData);
            }
          } catch (err) {
            console.error("[Auth] Session sync error:", err);
          }

          if (!isMounted) return;

          // Fetch user profile from Firestore via API
          const profile = await fetchProfile();
          if (isMounted) setUser(profile);
        } else {
          if (isMounted) setUser(null);
          // Clear session cookie
          try {
            await fetch("/api/auth/session", { method: "DELETE" });
          } catch {
            // Ignore
          }
        }
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
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

  /**
   * After login/signup, check if there's a preview plan in sessionStorage
   * (generated while logged out) and save it to Firestore.
   */
  async function savePreviewPlan(): Promise<string | null> {
    try {
      const stored = sessionStorage.getItem("planscope_preview");
      if (!stored) return null;

      const preview = JSON.parse(stored);
      const res = await fetch("/api/plans/save-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview }),
      });

      if (res.ok) {
        const { id } = await res.json();
        sessionStorage.removeItem("planscope_preview");
        return id;
      }
    } catch {
      // Non-fatal — user can still use the app normally
    }
    return null;
  }

  async function completeAuth() {
    await syncSession();
    const profile = await fetchProfile();
    setUser(profile);

    const savedPlanId = await savePreviewPlan();
    router.push(savedPlanId ? `/plan/${savedPlanId}` : "/dashboard");
  }

  async function signup(email: string, password: string) {
    const currentUser = firebaseAuth.currentUser;

    if (currentUser?.isAnonymous) {
      // Link anonymous account to email/password — keeps the same UID
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(currentUser, credential);
    } else {
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
    }

    await completeAuth();
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    await completeAuth();
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const currentUser = firebaseAuth.currentUser;

    if (currentUser?.isAnonymous) {
      await linkWithPopup(currentUser, provider);
    } else {
      await signInWithPopup(firebaseAuth, provider);
    }

    await completeAuth();
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

    await completeAuth();
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
