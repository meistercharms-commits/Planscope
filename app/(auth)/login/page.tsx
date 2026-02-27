"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { humanizeAuthError } from "@/lib/auth-errors";

const oauthErrors: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  google_not_configured: "Google sign-in is not available yet.",
  apple_denied: "Apple sign-in was cancelled.",
  apple_failed: "Apple sign-in failed. Please try again.",
  apple_not_configured: "Apple sign-in is not available yet.",
};

function LoginForm() {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address first, then tap \"Forgot password\".");
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      setResetSent(true);
      setError("");
    } catch (err) {
      setError(humanizeAuthError(err));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setOauthLoading("google");
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setOauthLoading(null);
    }
  }

  async function handleApple() {
    setError("");
    setOauthLoading("apple");
    try {
      await loginWithApple();
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setOauthLoading(null);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <Link
        href="/new-plan"
        className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="mb-8">
        <img
          src="/logo-wordmark-tagline.svg"
          alt="Planscope - Real plans for real people"
          className="h-20"
        />
      </div>

      <h1 className="text-xl font-semibold text-text mb-6 font-display">
        Welcome back
      </h1>

      {oauthError && oauthErrors[oauthError] && (
        <div className="px-4 py-3 bg-warm-bg border border-warm-border rounded-md text-sm text-warm-text mb-4">
          {oauthErrors[oauthError]}
        </div>
      )}

      {/* OAuth buttons */}
      <div className="space-y-3 mb-6">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={oauthLoading !== null}
          className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-border/60 rounded-lg shadow-sm text-sm font-medium text-text hover:shadow hover:bg-bg-subtle transition-all disabled:opacity-50 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {oauthLoading === "google" ? "Connecting…" : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={handleApple}
          disabled={oauthLoading !== null}
          className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-border/60 rounded-lg shadow-sm text-sm font-medium text-text hover:shadow hover:bg-bg-subtle transition-all disabled:opacity-50 cursor-pointer"
        >
          <svg width="16" height="20" viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.17 15.69c-.34.79-.5 1.14-.88 1.84-.53.87-1.27 1.95-2.2 1.96-.91.01-1.15-.59-2.39-.59-1.24.01-1.5.6-2.41.6-.93 0-1.63-.99-2.16-1.86C3.59 15.04 2.81 11.77 4.31 9.6c.76-1.03 1.87-1.65 2.94-1.65 1.15-.02 1.8.77 2.72.77.92 0 1.47-.77 2.79-.75.48 0 1.81.19 2.67 1.44-.07.04-1.59.93-1.57 2.76.02 2.2 1.93 2.93 1.95 2.94-.02.05-.3 1.05-1.64 2.58zM11.2.4c-1.44.06-3.1.95-3.77 2.14-.6 1.06-.88 2.44-.6 3.72 1.55.05 3.17-.9 3.78-2.07.57-1.08.77-2.39.59-3.79z" fill="currentColor"/>
          </svg>
          {oauthLoading === "apple" ? "Connecting…" : "Continue with Apple"}
        </button>
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

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {password.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>

        <div className="flex justify-end -mt-1">
          {resetSent ? (
            <p className="text-xs text-primary">Check your email for a reset link.</p>
          ) : (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              Forgot password?
            </button>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 bg-warm-bg border border-warm-border rounded-md text-sm text-warm-text">
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
