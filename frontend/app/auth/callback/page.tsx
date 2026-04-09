"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState("Processing your login…");

  useEffect(() => {
    const token           = params.get("token");
    const needsOnboarding = params.get("needs_onboarding") === "true";
    const error           = params.get("error");

    if (error) {
      setStatus("Google login failed. Redirecting…");
      setTimeout(() => router.replace(`/auth/login?error=${error}`), 1500);
      return;
    }

    if (!token) {
      router.replace("/auth/login?error=no_token");
      return;
    }

    localStorage.setItem("solanka_token", token);

    if (needsOnboarding) {
      setStatus("Account created! Setting up your profile…");
      router.replace("/onboarding");
    } else {
      setStatus("Welcome back! Loading dashboard…");
      router.replace("/dashboard");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-sol-dark flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sol-purple to-sol-mint flex items-center justify-center mx-auto mb-6">
          <svg className="animate-spin w-7 h-7 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-white/60 text-sm">{status}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-sol-dark flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
