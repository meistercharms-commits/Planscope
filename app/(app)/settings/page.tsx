"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  CreditCard,
  Download,
  Trash2,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Check as CheckIcon,
  Brain,
  Smartphone,
  Bell,
  Eye,
  EyeOff,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/useAuth";
import { Tier, NotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from "@/types";
import {
  requestNotificationPermission,
  checkPermission,
  scheduleDailyCheckin,
  cancelDailyCheckin,
} from "@/lib/notifications";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const { showToast } = useToast();

  // Account - email
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Account - password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showChangePasswords, setShowChangePasswords] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Export
  const [exportLoading, setExportLoading] = useState(false);

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Learning
  const [learnEnabled, setLearnEnabled] = useState(true);
  const [learnFetched, setLearnFetched] = useState(false);
  const [learnLoading, setLearnLoading] = useState(false);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({ ...DEFAULT_NOTIFICATION_PREFS });
  const [notifLoading, setNotifLoading] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{ key: keyof NotificationPrefs; value: boolean } | null>(null);

  // Tier
  const [tierInfo, setTierInfo] = useState<{
    tier: Tier;
    label: string;
    usage: { plansThisMonth: number; plansLimit: number; plansRemaining: number | null };
  } | null>(null);
  const [tierLoading, setTierLoading] = useState(false);
  const [showAllPlans, setShowAllPlans] = useState(false);

  // Billing
  const [billingInfo, setBillingInfo] = useState<{
    stripeSubscriptionId: string | null;
    stripeSubscriptionStatus: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: string | null;
    billingPortalUrl: string | null;
  } | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    fetch("/api/settings/tier")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setTierInfo(data);
      })
      .catch((err) => console.error("[Settings] Tier fetch failed:", err));
    if (user) {
      fetch("/api/settings/learn-enabled")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setLearnEnabled(data.learnEnabled);
          setLearnFetched(true);
        })
        .catch((err) => {
          setLearnFetched(true);
          console.error("[Settings] Learn-enabled fetch failed:", err);
        });
      // Load billing info (subscription status + portal URL)
      fetch("/api/billing/customer")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setBillingInfo(data);
        })
        .catch((err) => console.error("[Settings] Billing fetch failed:", err));
      // Load notification preferences (must be inside user guard
      // so we have an auth session for the API call)
      fetch("/api/settings/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setNotifPrefs(data);
        })
        .catch((err) => console.error("[Settings] Notifications fetch failed:", err));
    }
  }, [user]);

  async function handleUpgrade(priceId: string) {
    setTierLoading(true);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Could not start checkout.", "error");
        return;
      }

      const { checkoutUrl } = await res.json();
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch {
      showToast("Could not start checkout. Please try again.", "error");
    } finally {
      setTierLoading(false);
    }
  }

  function handleManageBilling() {
    if (billingInfo?.billingPortalUrl) {
      window.location.href = billingInfo.billingPortalUrl;
    }
  }

  const isOAuth = user?.provider === "google" || user?.provider === "apple";

  // Check if ANY notification is currently enabled
  const anyNotifEnabled =
    notifPrefs.planReady ||
    notifPrefs.dailyCheckin ||
    notifPrefs.celebrations ||
    notifPrefs.focusTimer ||
    notifPrefs.nudges ||
    notifPrefs.promotional;

  async function handleNotifToggle(key: keyof NotificationPrefs, value: boolean) {
    // If enabling a notification and none are currently enabled, check permission first
    if (value && !anyNotifEnabled) {
      const perm = await checkPermission();
      if (perm === "prompt") {
        setPendingToggle({ key, value });
        setShowPermissionModal(true);
        return;
      }
      if (perm === "denied") {
        showToast("Notifications are disabled in your device settings.", "warning");
        return;
      }
    }

    await saveNotifPref(key, value);
  }

  async function saveNotifPref(key: string, value: boolean | string) {
    setNotifLoading(key);
    const prev = { ...notifPrefs };
    setNotifPrefs({ ...notifPrefs, [key]: value });

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();

      const updated = await res.json();
      setNotifPrefs(updated);

      // Handle daily check-in scheduling — use `updated` to avoid stale closure
      if (key === "dailyCheckin") {
        if (value) {
          await scheduleDailyCheckin(updated.dailyCheckinTime);
        } else {
          await cancelDailyCheckin();
        }
      }
    } catch {
      setNotifPrefs(prev);
      showToast("Could not update preference.", "error");
    } finally {
      setNotifLoading(null);
    }
  }

  async function handlePermissionConfirm() {
    setShowPermissionModal(false);
    const granted = await requestNotificationPermission();
    if (granted && pendingToggle) {
      await saveNotifPref(pendingToggle.key, pendingToggle.value);
    } else if (!granted) {
      showToast("You can enable notifications anytime in your device Settings.", "warning");
    }
    setPendingToggle(null);
  }

  async function handleCheckinTimeChange(time: string) {
    setNotifLoading("dailyCheckinTime");
    const prev = { ...notifPrefs };
    setNotifPrefs({ ...notifPrefs, dailyCheckinTime: time });

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCheckinTime: time }),
      });
      if (!res.ok) throw new Error();

      const updated = await res.json();
      setNotifPrefs(updated);

      if (updated.dailyCheckin) {
        await scheduleDailyCheckin(time);
      }
    } catch {
      setNotifPrefs(prev);
      showToast("Could not update time.", "error");
    } finally {
      setNotifLoading(null);
    }
  }

  async function handleCelebrationModeChange(mode: "milestones" | "every") {
    setNotifLoading("celebrationMode");
    const prev = { ...notifPrefs };
    setNotifPrefs({ ...notifPrefs, celebrationMode: mode });

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ celebrationMode: mode }),
      });
      if (!res.ok) throw new Error();

      const updated = await res.json();
      setNotifPrefs(updated);
    } catch {
      setNotifPrefs(prev);
      showToast("Could not update preference.", "error");
    } finally {
      setNotifLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    );
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);

    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, currentPassword: emailPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update email");
      }

      showToast("Email address updated.");
      setNewEmail("");
      setEmailPassword("");
      setShowEmailForm(false);
      refreshUser();
    } catch (err) {
      setEmailError((err as Error).message);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update password");
      }

      showToast("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) throw new Error("Export failed");

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "planscope-data-export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Data exported.");
    } catch {
      showToast("Could not export data. Try again.", "error");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      setShowDeleteModal(false);
      await logout();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="animate-fade-in">
        <h1 className="text-[28px] font-bold text-text font-display mb-2">
          Profile & Settings
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Manage your account details.
        </p>

        <div className="space-y-6">
          {/* Section 1: Account (logged-in only) */}
          {/* Account upsell for anonymous users */}
          {!user && (
            <section className="bg-primary-light rounded-lg p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <Smartphone size={20} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-semibold text-text">
                    Create an account
                  </h2>
                  <p className="text-xs text-text-secondary mt-1 mb-3">
                    Your plans are saved to this device only. Create a free account so they&apos;re backed up and accessible across all your devices.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href="/signup"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                    >
                      Create account
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-md hover:bg-bg-subtle transition-colors"
                    >
                      Log in
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {user ? (
            <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
                <Mail size={20} className="text-primary" />
                Account
              </h2>

              <p className="text-sm text-text-secondary mb-4">
                Signed in as{" "}
                <span className="font-medium text-text">{user.email}</span>
                {isOAuth && (
                  <span className="text-xs text-text-tertiary ml-1">
                    via {user.provider === "google" ? "Google" : "Apple"}
                  </span>
                )}
              </p>

              {!isOAuth && (
                <>
                  {/* Change email */}
                  <div className="mb-3">
                    <button
                      onClick={() => {
                        setShowEmailForm(!showEmailForm);
                        setEmailError("");
                      }}
                      className="text-sm text-primary hover:underline font-medium cursor-pointer"
                    >
                      Change email address
                    </button>

                    {showEmailForm && (
                      <form
                        onSubmit={handleChangeEmail}
                        className="mt-3 space-y-3 pl-0 animate-slide-open"
                      >
                        <Input
                          label="New email"
                          type="email"
                          placeholder="you@example.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                        />
                        <div className="relative">
                          <Input
                            label="Current password"
                            type={showEmailPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            required
                          />
                          {emailPassword.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowEmailPassword(!showEmailPassword)}
                              className="absolute right-3 top-[38px] text-text-tertiary hover:text-text-secondary transition-colors"
                              aria-label={showEmailPassword ? "Hide password" : "Show password"}
                            >
                              {showEmailPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          )}
                        </div>
                        {emailError && (
                          <p className="text-sm text-warm-text">{emailError}</p>
                        )}
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" loading={emailLoading}>
                            Update email
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowEmailForm(false);
                              setEmailError("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Change password */}
                  <div>
                    <button
                      onClick={() => {
                        setShowPasswordForm(!showPasswordForm);
                        setPasswordError("");
                      }}
                      className="text-sm text-primary hover:underline font-medium cursor-pointer"
                    >
                      Change password
                    </button>

                    {showPasswordForm && (
                      <form
                        onSubmit={handleChangePassword}
                        className="mt-3 space-y-3 pl-0 animate-slide-open"
                      >
                        <div className="relative">
                          <Input
                            label="Current password"
                            type={showChangePasswords ? "text" : "password"}
                            placeholder="Your current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                          />
                          {currentPassword.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowChangePasswords(!showChangePasswords)}
                              className="absolute right-3 top-[38px] text-text-tertiary hover:text-text-secondary transition-colors"
                              aria-label={showChangePasswords ? "Hide password" : "Show password"}
                            >
                              {showChangePasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          )}
                        </div>
                        <Input
                          label="New password"
                          type={showChangePasswords ? "text" : "password"}
                          placeholder="At least 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                        <Input
                          label="Confirm new password"
                          type={showChangePasswords ? "text" : "password"}
                          placeholder="Type it again"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                          <p className="text-xs text-warm-text">Passwords don&apos;t match yet.</p>
                        )}
                        {passwordError && (
                          <p className="text-sm text-warm-text">{passwordError}</p>
                        )}
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" loading={passwordLoading}>
                            Update password
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordError("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              )}
            </section>
          ) : null}

          {/* Section 2: Subscription */}
          <section className="bg-bg-card rounded-lg shadow-card ring-1 ring-primary/15 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              Subscription
            </h2>

            {tierInfo && (
              <p className="text-sm text-text-secondary mb-4">
                You&apos;ve used {tierInfo.usage.plansThisMonth} of{" "}
                {tierInfo.usage.plansLimit == null
                  ? "unlimited"
                  : tierInfo.usage.plansLimit}{" "}
                plans this month.
              </p>
            )}

            {/* Billing management for subscribed users */}
            {billingInfo?.stripeSubscriptionId && (
              <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">
                      {billingInfo.stripeSubscriptionStatus === "active"
                        ? "Active subscription"
                        : billingInfo.stripeSubscriptionStatus === "past_due"
                          ? "Payment overdue"
                          : "Subscription ending"}
                    </p>
                    {billingInfo.stripeCurrentPeriodEnd && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {billingInfo.stripeSubscriptionStatus === "active"
                          ? "Renews"
                          : "Access until"}{" "}
                        {new Date(billingInfo.stripeCurrentPeriodEnd).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleManageBilling}
                    disabled={!billingInfo.billingPortalUrl}
                  >
                    Manage Billing
                  </Button>
                </div>
              </div>
            )}

            {/* Current plan — always visible */}
            <div className="space-y-3">
              {tierInfo?.tier === "free" && (
                <TierCard name="Free" price="£0" tier="free" current features={["Start planning without commitment", "4 plans per month", "Full access to AI planning", "Permission to say no to overwhelm"]} onSelect={handleManageBilling} loading={tierLoading} hasSubscription={!!billingInfo?.stripeSubscriptionId} />
              )}
              {tierInfo?.tier === "pro" && (
                <TierCard name="Pro" price="£7.99/month" tier="pro" current features={["8 plans per month for people serious about execution", "Build planning momentum with recurring weekly templates", "Protect your deep work with built-in Focus Mode", "Capture your thoughts in seconds with voice-to-plan"]} onSelect={() => {}} loading={tierLoading} hasSubscription={!!billingInfo?.stripeSubscriptionId} />
              )}
              {tierInfo?.tier === "pro_plus" && (
                <TierCard name="Pro Plus" price={billingCycle === "monthly" ? "£14.99/month" : "£149/year"} tier="pro_plus" current features={["Plan everything, unlimited possibilities", "Sync across work, personal, side projects", "Spot patterns and bottlenecks fast with full plan history and completion data", "For people juggling it all"]} onSelect={() => {}} loading={tierLoading} hasSubscription={!!billingInfo?.stripeSubscriptionId} />
              )}
            </div>

            {/* Compare plans — collapsible */}
            <button
              onClick={() => setShowAllPlans(!showAllPlans)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary mt-4 cursor-pointer hover:underline"
            >
              {showAllPlans ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {showAllPlans ? "Hide plans" : "Compare plans"}
            </button>
            {showAllPlans && (
              <div className="space-y-3 mt-3 animate-slide-open">
                {tierInfo?.tier !== "free" && (
                  <TierCard name="Free" price="£0" tier="free" current={false} features={["Start planning without commitment", "4 plans per month", "Full access to AI planning", "Permission to say no to overwhelm"]} onSelect={handleManageBilling} loading={tierLoading} isDowngrade={true} hasSubscription={!!billingInfo?.stripeSubscriptionId} />
                )}
                {tierInfo?.tier !== "pro" && (
                  <TierCard name="Pro" price="£7.99/month" tier="pro" current={false} features={["8 plans per month for people serious about execution", "Build planning momentum with recurring weekly templates", "Protect your deep work with built-in Focus Mode", "Capture your thoughts in seconds with voice-to-plan"]} onSelect={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || "price_1T593x4kVPZipsrTEGYfEPYp")} loading={tierLoading} accent isDowngrade={tierInfo?.tier === "pro_plus"} hasSubscription={!!billingInfo?.stripeSubscriptionId} onManageBilling={handleManageBilling} />
                )}
                {tierInfo?.tier !== "pro_plus" && (
                  <TierCard
                    name="Pro Plus"
                    price={billingCycle === "monthly" ? "£14.99/month" : "£149/year"}
                    tier="pro_plus"
                    current={false}
                    features={["Plan everything, unlimited possibilities", "Sync across work, personal, side projects", "Spot patterns and bottlenecks fast with full plan history and completion data", "Share plans with up to 3 people", "For people juggling it all"]}
                    onSelect={() => handleUpgrade(billingCycle === "monthly" ? (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_PLUS_MONTHLY || "price_1T595K4kVPZipsrTHBNxYUoT") : (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_PLUS_ANNUAL || "price_1T596r4kVPZipsrTF2oGtiiA"))}
                    loading={tierLoading}
                    billingToggle={
                      <div className="flex gap-1 mt-1">
                        <button onClick={(e) => { e.stopPropagation(); setBillingCycle("monthly"); }} className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${billingCycle === "monthly" ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-border hover:border-primary/40"}`}>Monthly</button>
                        <button onClick={(e) => { e.stopPropagation(); setBillingCycle("annual"); }} className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${billingCycle === "annual" ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-border hover:border-primary/40"}`}>Annual (save 17%)</button>
                      </div>
                    }
                    hasSubscription={!!billingInfo?.stripeSubscriptionId}
                  />
                )}
              </div>
            )}

          </section>

          {/* Section 3: Learning & Feedback (logged-in only) */}
          {user ? (
            <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
                <Brain size={20} className="text-primary" />
                Learning &amp; Feedback
              </h2>

              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium text-text">
                    Let Planscope learn from your planning patterns
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    When enabled, the app uses your completion history to improve
                    recommendations. No data is shared externally.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={learnEnabled}
                  onClick={async () => {
                    const newValue = !learnEnabled;
                    setLearnEnabled(newValue);
                    setLearnLoading(true);
                    try {
                      const res = await fetch("/api/settings/learn-enabled", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ enabled: newValue }),
                      });
                      if (!res.ok) throw new Error();
                      showToast(
                        newValue
                          ? "Learning enabled"
                          : "Learning disabled"
                      );
                    } catch {
                      setLearnEnabled(!newValue);
                      showToast("Could not update preference.", "error");
                    } finally {
                      setLearnLoading(false);
                    }
                  }}
                  disabled={learnLoading || !learnFetched}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    learnEnabled && learnFetched ? "bg-primary" : "bg-border"
                  } ${learnLoading || !learnFetched ? "opacity-50" : ""}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      learnEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </section>
          ) : null}

          {/* Section: Notifications (logged-in only) */}
          {user?.email ? (
            <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
                <Bell size={20} className="text-primary" />
                Notifications
              </h2>

              <div className="space-y-4">
                {/* Plan Ready */}
                <NotifToggleRow
                  label="Plan ready"
                  description="Get notified when your weekly plan is ready to review."
                  enabled={notifPrefs.planReady}
                  loading={notifLoading === "planReady"}
                  onToggle={(val) => handleNotifToggle("planReady", val)}
                />

                {/* Daily Check-in */}
                <NotifToggleRow
                  label="Daily check-in"
                  description="A gentle reminder of today's priorities."
                  enabled={notifPrefs.dailyCheckin}
                  loading={notifLoading === "dailyCheckin"}
                  onToggle={(val) => handleNotifToggle("dailyCheckin", val)}
                >
                  {notifPrefs.dailyCheckin && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="time"
                        value={notifPrefs.dailyCheckinTime}
                        onChange={(e) => handleCheckinTimeChange(e.target.value)}
                        className="text-sm border border-border rounded-md px-2 py-1 bg-white text-text"
                      />
                      <span className="text-xs text-text-secondary">daily</span>
                    </div>
                  )}
                </NotifToggleRow>

                {/* Celebrations */}
                <NotifToggleRow
                  label="Task celebrations"
                  description="Celebrate your progress at milestones."
                  enabled={notifPrefs.celebrations}
                  loading={notifLoading === "celebrations"}
                  onToggle={(val) => handleNotifToggle("celebrations", val)}
                >
                  {notifPrefs.celebrations && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleCelebrationModeChange("milestones")}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                          notifPrefs.celebrationMode === "milestones"
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-text-secondary border-border hover:border-primary/40"
                        }`}
                      >
                        Milestones only
                      </button>
                      <button
                        onClick={() => handleCelebrationModeChange("every")}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                          notifPrefs.celebrationMode === "every"
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-text-secondary border-border hover:border-primary/40"
                        }`}
                      >
                        Every task
                      </button>
                    </div>
                  )}
                </NotifToggleRow>

                {/* Focus Timer */}
                <NotifToggleRow
                  label="Focus timer"
                  description="Get notified when your focus session timer ends."
                  enabled={notifPrefs.focusTimer}
                  loading={notifLoading === "focusTimer"}
                  onToggle={(val) => handleNotifToggle("focusTimer", val)}
                />

                {/* Gentle Nudges */}
                <NotifToggleRow
                  label="Gentle nudges"
                  description="A soft reminder if you haven't opened your plan in a few days."
                  enabled={notifPrefs.nudges}
                  loading={notifLoading === "nudges"}
                  onToggle={(val) => handleNotifToggle("nudges", val)}
                />

                {/* Promotional */}
                <NotifToggleRow
                  label="Updates & offers"
                  description="Occasional updates about new features and plan limits."
                  enabled={notifPrefs.promotional}
                  loading={notifLoading === "promotional"}
                  onToggle={(val) => handleNotifToggle("promotional", val)}
                />
              </div>
            </section>
          ) : null}

          {/* Section 4: Data (logged-in only) */}
          {user ? (
            <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
                <Download size={20} className="text-primary" />
                Data
              </h2>

              <div className="space-y-4">
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={exportLoading}
                    onClick={handleExport}
                  >
                    <Download size={16} className="mr-2" />
                    Export my data
                  </Button>
                  <p className="text-xs text-text-secondary mt-2">
                    Download a copy of all your data (plans, tasks, and account
                    information) in JSON format.
                  </p>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete account
                  </Button>
                  <p className="text-xs text-text-secondary mt-2">
                    Permanently delete your account and all associated data. This
                    cannot be undone.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {/* Section 5: Help */}
          <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6 mb-8">
            <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
              <HelpCircle size={20} className="text-primary" />
              Help
            </h2>

            <div className="space-y-1">
              <a
                href="mailto:support@planscope.app"
                className="flex items-center justify-between py-2.5 text-sm text-text hover:bg-bg-subtle -mx-2 px-2 rounded-md transition-colors"
              >
                <span>Email support</span>
                <ChevronRight size={16} className="text-text-tertiary" />
              </a>
              <a
                href="https://planscope.app/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2.5 text-sm text-text hover:bg-bg-subtle -mx-2 px-2 rounded-md transition-colors"
              >
                <span>Privacy policy</span>
                <ChevronRight size={16} className="text-text-tertiary" />
              </a>
              <a
                href="https://planscope.app/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2.5 text-sm text-text hover:bg-bg-subtle -mx-2 px-2 rounded-md transition-colors"
              >
                <span>Terms of use</span>
                <ChevronRight size={16} className="text-text-tertiary" />
              </a>
            </div>
            <p className="text-[10px] text-text-tertiary text-center mt-4">
              Planscope v1.0
            </p>
          </section>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation("");
        }}
        title="Delete account"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will permanently delete your account, all your plans, and all
            your tasks. This action cannot be undone.
          </p>
          <p className="text-sm font-medium text-text">
            Type <span className="text-accent font-semibold">DELETE</span> to
            confirm.
          </p>
          <Input
            label="Confirmation"
            placeholder="Type DELETE"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={deleteLoading}
              disabled={deleteConfirmation !== "DELETE"}
            >
              Delete my account
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notification Permission Modal */}
      <Modal
        open={showPermissionModal}
        onClose={() => {
          setShowPermissionModal(false);
          setPendingToggle(null);
        }}
        title="Enable notifications?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Planscope notifications are gentle — never pushy, never guilt.
            You control exactly which ones you receive and can turn them off anytime.
          </p>
          <div className="flex gap-2">
            <Button onClick={handlePermissionConfirm}>
              Enable notifications
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowPermissionModal(false);
                setPendingToggle(null);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Notification toggle row component ─── */
function NotifToggleRow({
  label,
  description,
  enabled,
  loading,
  onToggle,
  children,
}: {
  label: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onToggle: (value: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <p className="text-sm font-medium text-text">{label}</p>
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            enabled ? "bg-primary" : "bg-border"
          } ${loading ? "opacity-50" : ""}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {children}
    </div>
  );
}

function TierCard({
  name,
  price,
  tier,
  current,
  features,
  comingSoon,
  onSelect,
  loading,
  accent,
  billingToggle,
  isDowngrade,
  hasSubscription,
  onManageBilling,
}: {
  name: string;
  price: string;
  tier: string;
  current: boolean;
  features: string[];
  comingSoon?: string[];
  onSelect: () => void;
  loading: boolean;
  accent?: boolean;
  billingToggle?: React.ReactNode;
  isDowngrade?: boolean;
  hasSubscription?: boolean;
  onManageBilling?: () => void;
}) {
  // For downgrades, direct to Stripe billing portal
  const handleClick = () => {
    if (isDowngrade && hasSubscription && onManageBilling) {
      onManageBilling();
    } else {
      onSelect();
    }
  };

  // Don't show action button for Free tier if user is already on Free
  const showButton = !current && !(tier === "free" && !hasSubscription);

  return (
    <div
      className={`rounded-lg border p-4 ${
        current
          ? "border-primary bg-primary/5"
          : accent
            ? "border-primary/30"
            : "border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={`/icons/${tier === "free" ? "free" : tier === "pro" ? "pro" : "pro_plus"}.svg`}
            alt=""
            className="w-5 h-5"
          />
          <div>
            <h3 className="font-semibold text-text font-display">{name}</h3>
            <p className="text-sm text-text-secondary">{price}</p>
            {billingToggle}
          </div>
        </div>
        {current ? (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
            Current plan
          </span>
        ) : showButton ? (
          <Button
            size="sm"
            variant={isDowngrade ? "secondary" : accent ? "primary" : "secondary"}
            onClick={handleClick}
            loading={loading}
          >
            {isDowngrade ? "Downgrade" : "Upgrade"}
          </Button>
        ) : null}
      </div>
      <ul className="space-y-1 mt-3">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-xs sm:text-sm text-text-secondary"
          >
            <CheckIcon size={14} className="text-primary flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
        {comingSoon?.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-xs sm:text-sm text-text-tertiary"
          >
            <CheckIcon size={14} className="text-text-tertiary flex-shrink-0" />
            {f}{" "}
            <span className="text-xs italic">(coming soon)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
