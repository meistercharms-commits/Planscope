"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { LogOut, Plus, Menu, X, User, Settings, Calendar, LayoutDashboard, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import PlanscopeLogo from "@/components/ui/PlanscopeLogo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light rounded-md transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Plan</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
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
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 animate-scale-in z-50">
                  {isLoggedIn ? (
                    <>
                      <div className="px-3 py-2 text-xs text-text-secondary border-b border-border">
                        {user?.email}
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                      >
                        <LayoutDashboard size={16} />
                        My Plans
                      </Link>
                      <Link
                        href="/history"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                      >
                        <Calendar size={16} />
                        Plan History
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors cursor-pointer"
                      >
                        <LogOut size={16} />
                        Log out
                      </button>
                      <div className="border-t border-border my-1" />
                      <a
                        href="mailto:support@planscope.app?subject=Feedback"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-subtle transition-colors"
                      >
                        <MessageSquare size={16} />
                        Share Feedback
                      </a>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                      >
                        <LayoutDashboard size={16} />
                        My Plans
                      </Link>
                      <Link
                        href="/history"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                      >
                        <Calendar size={16} />
                        Plan History
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                      <div className="border-t border-border my-1" />
                      <Link
                        href="/signup"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-bg-subtle transition-colors"
                      >
                        <User size={16} />
                        Save my plans
                      </Link>
                      <Link
                        href="/login"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                      >
                        <LogOut size={16} />
                        Log in
                      </Link>
                      <div className="border-t border-border my-1" />
                      <a
                        href="mailto:support@planscope.app?subject=Feedback"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-subtle transition-colors"
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

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
