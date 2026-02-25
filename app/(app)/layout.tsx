"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { LogOut, Plus, Menu, X, User, Settings, Calendar } from "lucide-react";
import { useState } from "react";
import PlanscopeLogo from "@/components/ui/PlanscopeLogo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <PlanscopeLogo size={48} />
        <div className="text-xl font-semibold text-text font-display">
          Planscope
        </div>
      </div>
    );
  }

  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-bg-card/80 backdrop-blur-md border-b border-border/60 h-14 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
        <Link
          href={isLoggedIn ? "/dashboard" : "/new-plan"}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <PlanscopeLogo size={28} />
          <span className="text-xl font-semibold text-text font-display">
            Planscope
          </span>
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
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 animate-scale-in">
                {isLoggedIn ? (
                  <>
                    <div className="px-3 py-2 text-xs text-text-secondary border-b border-border">
                      {user?.email}
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                    >
                      <Settings size={16} />
                      Profile & Settings
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-subtle transition-colors"
                    >
                      <Calendar size={16} />
                      Plan History
                    </Link>
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
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
