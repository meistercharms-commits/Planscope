"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const oauthErrors: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  google_not_configured: "Google sign-in is not available yet.",
  apple_denied: "Apple sign-in was cancelled.",
  apple_failed: "Apple sign-in failed. Please try again.",
  apple_not_configured: "Apple sign-in is not available yet.",
};

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary font-display">
          Planscope
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Real plans for real people
        </p>
      </div>

      <h2 className="text-xl font-semibold text-text mb-6 font-display">
        Welcome back
      </h2>

      {oauthError && oauthErrors[oauthError] && (
        <div className="px-4 py-3 bg-error/5 border border-error/20 rounded-md text-sm text-error mb-4">
          {oauthErrors[oauthError]}
        </div>
      )}

      {/* OAuth buttons */}
      <div className="space-y-3 mb-6">
        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-sm font-medium text-text hover:bg-bg-subtle transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <a
          href="/api/auth/apple"
          className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-sm font-medium text-text hover:bg-bg-subtle transition-colors"
        >
          <svg width="16" height="20" viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.17 15.69c-.34.79-.5 1.14-.88 1.84-.53.87-1.27 1.95-2.2 1.96-.91.01-1.15-.59-2.39-.59-1.24.01-1.5.6-2.41.6-.93 0-1.63-.99-2.16-1.86C3.59 15.04 2.81 11.77 4.31 9.6c.76-1.03 1.87-1.65 2.94-1.65 1.15-.02 1.8.77 2.72.77.92 0 1.47-.77 2.79-.75.48 0 1.81.19 2.67 1.44-.07.04-1.59.93-1.57 2.76.02 2.2 1.93 2.93 1.95 2.94-.02.05-.3 1.05-1.64 2.58zM11.2.4c-1.44.06-3.1.95-3.77 2.14-.6 1.06-.88 2.44-.6 3.72 1.55.05 3.17-.9 3.78-2.07.57-1.08.77-2.39.59-3.79z" fill="currentColor"/>
          </svg>
          Continue with Apple
        </a>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-secondary">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="px-4 py-3 bg-error/5 border border-error/20 rounded-md text-sm text-error">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth size="lg">
          Log in
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
