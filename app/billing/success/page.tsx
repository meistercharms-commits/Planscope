"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    // Auto-redirect to settings after countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/settings");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E8E8E8] p-8 max-w-md w-full mx-4 text-center">
      {/* Success Icon */}
      <div className="w-16 h-16 bg-[#2E8B6A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-[#2E8B6A]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-display font-bold text-[#404040] mb-2">
        Upgrade Successful!
      </h1>

      <p className="text-[#808080] mb-6">
        Your subscription is now active. You can start using your new features
        straight away.
      </p>

      {sessionId && (
        <p className="text-xs text-[#808080] mb-4">
          Session: {sessionId.slice(0, 20)}...
        </p>
      )}

      <p className="text-sm text-[#808080] mb-6">
        Redirecting to settings in {countdown} second
        {countdown !== 1 ? "s" : ""}...
      </p>

      <button
        onClick={() => router.push("/settings")}
        className="bg-[#2E8B6A] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#257556] transition-colors"
      >
        Go to Settings Now
      </button>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <Suspense
        fallback={
          <div className="text-[#808080] text-center">
            <p>Loading...</p>
          </div>
        }
      >
        <BillingSuccessContent />
      </Suspense>
    </div>
  );
}
