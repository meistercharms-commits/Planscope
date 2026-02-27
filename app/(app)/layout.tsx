"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { auth as firebaseAuth } from "@/lib/firebase";
import { usePathname } from "next/navigation";
import { LogOut, Plus, Menu, X, User, Settings, Calendar, LayoutDashboard, MessageSquare, WifiOff, Pause, Play, Timer } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useOnlineStatus } from "@/lib/use-online-status";
import { FocusTimerProvider, useFocusTimer } from "@/lib/focus-timer-context";
import { getCategoryColors } from "@/lib/category-colors";
import { formatTime } from "@/lib/parse-time-estimate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FocusTimerProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </FocusTimerProvider>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isOnline = useOnlineStatus();
  const { timer, timeLeft, isRunning, pauseTimer, resumeTimer } = useFocusTimer();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus first menu item when menu opens; handle arrow keys + Escape
  useEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current;
    if (!menu) return;

    // Focus first interactive item
    const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = menu!.querySelectorAll<HTMLElement>('[role="menuitem"]');
        const focused = document.activeElement;
        let idx = Array.from(items).indexOf(focused as HTMLElement);
        if (e.key === "ArrowDown") idx = (idx + 1) % items.length;
        else idx = (idx - 1 + items.length) % items.length;
        items[idx]?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);
  const previewSaveAttempted = useRef(false);
  const isOnFocusPage = pathname.includes("/focus/");

  // Fallback: save unsaved preview plan after auth loads
  // This catches cases where completeAuth() failed to save the preview
  useEffect(() => {
    if (loading || !user || previewSaveAttempted.current) return;
    previewSaveAttempted.current = true;

    const stored = sessionStorage.getItem("planscope_preview");
    if (!stored) return;

    async function saveUnsavedPreview() {
      try {
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) return;

        const idToken = await currentUser.getIdToken();
        let preview;
        try {
          preview = JSON.parse(stored!);
        } catch {
          console.error("[Layout] Corrupted preview in sessionStorage");
          sessionStorage.removeItem("planscope_preview");
          return;
        }
        const res = await fetch("/api/plans/save-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({ preview }),
        });
        if (res.ok) {
          const { id } = await res.json();
          sessionStorage.removeItem("planscope_preview");
          router.push(`/plan/${id}`);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error("[Layout] Fallback preview save failed:", res.status, errData);
        }
      } catch (err) {
        console.error("[Layout] Fallback preview save error:", err);
      }
    }

    saveUnsavedPreview();
  }, [user, loading, router]);

  // Configure native status bar so WebView sits below it (not behind)
  useEffect(() => {
    async function configureStatusBar() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        // Not running in Capacitor — ignore
      }
    }
    configureStatusBar();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <style>{`
          @keyframes fillCircle {
            0% { clip-path: polygon(50% 50%, 50% 0%, 50% 0%); }
            25% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%); }
            50% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%); }
            75% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 50%); }
            100% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%); }
          }
          .loading-logo {
            animation: fillCircle 2s ease-in-out infinite;
          }
        `}</style>
        <img
          src="/logo-circle-outline-primary.svg"
          alt="Loading"
          className="loading-logo w-16 h-16"
        />
        <div className="text-lg font-semibold text-text font-display">
          Planscope
        </div>
      </div>
    );
  }

  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 bg-bg-card border-b border-border/60 h-14 flex items-center justify-between px-4 sm:px-6 z-40">
        <Link
          href="/dashboard"
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo-circle-black-wordmark.svg"
            alt="Planscope"
            className="h-10"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/new-plan"
            className={`flex items-center gap-1 px-3 py-2 text-xs sm:text-sm sm:gap-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${pathname === "/new-plan" ? "bg-primary-light text-primary" : "text-primary hover:bg-primary-light"}`}
          >
            <Plus size={16} />
            New Plan
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="p-2 text-text-secondary hover:text-text hover:bg-bg-subtle rounded-md transition-colors cursor-pointer"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {menuOpen && (
              <>
                {/* Invisible backdrop to close menu on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div ref={menuRef} role="menu" className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 animate-scale-in z-50">
                  {isLoggedIn ? (
                    <>
                      <div className="px-3 py-2 text-xs text-text-secondary border-b border-border">
                        {user?.email}
                      </div>
                      <Link
                        href="/dashboard"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm outline-none transition-colors ${pathname === "/dashboard" ? "text-primary bg-primary-light" : "text-text hover:bg-bg-subtle focus:bg-bg-subtle"}`}
                      >
                        <LayoutDashboard size={16} />
                        My Plans
                      </Link>
                      <Link
                        href="/history"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm outline-none transition-colors ${pathname === "/history" ? "text-primary bg-primary-light" : "text-text hover:bg-bg-subtle focus:bg-bg-subtle"}`}
                      >
                        <Calendar size={16} />
                        Plan History
                      </Link>
                      <Link
                        href="/settings"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm outline-none transition-colors ${pathname === "/settings" ? "text-primary bg-primary-light" : "text-text hover:bg-bg-subtle focus:bg-bg-subtle"}`}
                      >
                        <Settings size={16} />
                        Profile & Settings
                      </Link>
                      <div className="border-t border-border my-1" />
                      <button
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle focus:bg-bg-subtle outline-none transition-colors cursor-pointer"
                      >
                        <LogOut size={16} />
                        Log out
                      </button>
                      <div className="border-t border-border my-1" />
                      <a
                        href="mailto:support@planscope.app?subject=Feedback"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-subtle focus:bg-bg-subtle outline-none transition-colors"
                      >
                        <MessageSquare size={16} />
                        Share Feedback
                      </a>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dashboard"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm outline-none transition-colors ${pathname === "/dashboard" ? "text-primary bg-primary-light" : "text-text hover:bg-bg-subtle focus:bg-bg-subtle"}`}
                      >
                        <LayoutDashboard size={16} />
                        My Plans
                      </Link>
                      <Link
                        href="/history"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm outline-none transition-colors ${pathname === "/history" ? "text-primary bg-primary-light" : "text-text hover:bg-bg-subtle focus:bg-bg-subtle"}`}
                      >
                        <Calendar size={16} />
                        Plan History
                      </Link>
                      <Link
                        href="/settings"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm outline-none transition-colors ${pathname === "/settings" ? "text-primary bg-primary-light" : "text-text hover:bg-bg-subtle focus:bg-bg-subtle"}`}
                      >
                        <Settings size={16} />
                        Profile & Settings
                      </Link>
                      <div className="border-t border-border my-1" />
                      <Link
                        href="/signup"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-bg-subtle focus:bg-bg-subtle outline-none transition-colors"
                      >
                        <User size={16} />
                        Save my plans
                      </Link>
                      <Link
                        href="/login"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle focus:bg-bg-subtle outline-none transition-colors"
                      >
                        <LogOut size={16} />
                        Log in
                      </Link>
                      <div className="border-t border-border my-1" />
                      <a
                        href="mailto:support@planscope.app?subject=Feedback"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-subtle focus:bg-bg-subtle outline-none transition-colors"
                      >
                        <MessageSquare size={16} />
                        Share Feedback
                      </a>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-warning/15 border-b border-warning/30 px-4 py-2 flex items-center justify-center gap-2 animate-slide-open">
          <WifiOff size={14} className="text-accent flex-shrink-0" />
          <p className="text-xs text-text-secondary">
            You&apos;re offline. Changes will sync when you reconnect.
          </p>
        </div>
      )}

      {/* Focus timer banner — shown on all pages except the focus page itself */}
      {timer && !isOnFocusPage && timeLeft > 0 && (() => {
        const colors = getCategoryColors(timer.category);
        return (
          <Link
            href={`/plan/${timer.planId}/focus/${timer.taskId}`}
            className="flex items-center gap-3 px-4 py-2 border-b border-border/60 bg-bg-card hover:bg-bg-subtle transition-colors"
            style={{ borderLeftWidth: 3, borderLeftColor: colors.border }}
          >
            <Timer size={14} style={{ color: colors.border }} className="flex-shrink-0" />
            <span className="text-xs text-text truncate flex-1 font-medium">
              {timer.taskTitle}
            </span>
            <span className="text-xs font-semibold text-text tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isRunning) pauseTimer();
                else resumeTimer();
              }}
              className="p-1 rounded-full hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              {isRunning ? <Pause size={14} className="text-text-secondary" /> : <Play size={14} className="text-text-secondary" />}
            </button>
          </Link>
        );
      })()}

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
