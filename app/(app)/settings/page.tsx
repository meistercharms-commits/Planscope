"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  CreditCard,
  Download,
  Trash2,
  HelpCircle,
  ExternalLink,
  Check as CheckIcon,
  Brain,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/useAuth";
import { Tier } from "@/types";

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
  const [passwordError, setPasswordError] = useState("");

  // Export
  const [exportLoading, setExportLoading] = useState(false);

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Learning
  const [learnEnabled, setLearnEnabled] = useState(true);
  const [learnLoading, setLearnLoading] = useState(false);

  // Tier
  const [tierInfo, setTierInfo] = useState<{
    tier: Tier;
    label: string;
    usage: { plansThisMonth: number; plansLimit: number; plansRemaining: number | null };
  } | null>(null);
  const [tierLoading, setTierLoading] = useState(false);

  // Redirect anonymous users
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetch("/api/settings/tier")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setTierInfo(data))
        .catch(() => {});
      fetch("/api/settings/learn-enabled")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setLearnEnabled(data.learnEnabled);
        })
        .catch(() => {});
    }
  }, [user]);

  async function handleChangeTier(newTier: Tier) {
    setTierLoading(true);
    try {
      const res = await fetch("/api/settings/tier", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier }),
      });
      if (res.ok) {
        const data = await res.json();
        const tierLabel = data.tier === "free" ? "Free" : data.tier === "pro" ? "Pro" : "Pro Plus";
        setTierInfo((prev) =>
          prev ? { ...prev, tier: data.tier, label: tierLabel } : prev
        );
        showToast(`Switched to ${tierLabel}`);
        refreshUser();
      }
    } catch {
      showToast("Could not update tier.", "error");
    } finally {
      setTierLoading(false);
    }
  }

  const isOAuth = user?.provider === "google" || user?.provider === "apple";

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-lg text-text-secondary">Loading...</div>
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="animate-fade-in">
        <h1 className="text-[28px] font-bold text-text font-display">
          Profile & Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1 mb-8">
          Manage your account details.
        </p>

        <div className="space-y-6">
          {/* Section 1: Account */}
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
                      <Input
                        label="Current password"
                        type="password"
                        placeholder="Confirm your password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        required
                      />
                      {emailError && (
                        <p className="text-sm text-error">{emailError}</p>
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
                      <Input
                        label="Current password"
                        type="password"
                        placeholder="Your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <Input
                        label="New password"
                        type="password"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Input
                        label="Confirm new password"
                        type="password"
                        placeholder="Type it again"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      {passwordError && (
                        <p className="text-sm text-error">{passwordError}</p>
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

          {/* Section 2: Subscription */}
          <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              Subscription
            </h2>

            {tierInfo && (
              <p className="text-sm text-text-secondary mb-4">
                You&apos;ve used {tierInfo.usage.plansThisMonth} of{" "}
                {tierInfo.usage.plansLimit === Infinity
                  ? "unlimited"
                  : tierInfo.usage.plansLimit}{" "}
                plans this month.
              </p>
            )}

            <div className="space-y-3">
              <TierCard
                name="Free"
                price="£0"
                tier="free"
                current={tierInfo?.tier === "free"}
                features={[
                  "4 plans per month",
                  "7-item focus cap",
                  "Tweak, mark done, park list",
                ]}
                onSelect={() => handleChangeTier("free")}
                loading={tierLoading}
              />
              <TierCard
                name="Pro"
                price="£2.99/month"
                tier="pro"
                current={tierInfo?.tier === "pro"}
                features={[
                  "8 plans per month",
                  "Plan history & completion rates",
                  "Recurring weeks (template mode)",
                  "7-item focus cap",
                ]}
                onSelect={() => handleChangeTier("pro")}
                loading={tierLoading}
                accent
              />
              <TierCard
                name="Pro Plus"
                price="£4.99/month"
                priceSub="or £49/year"
                tier="pro_plus"
                current={tierInfo?.tier === "pro_plus"}
                features={[
                  "Unlimited plans",
                  "Multiple active plans per week",
                  "Plan history & completion rates",
                  "Recurring weeks (template mode)",
                ]}
                comingSoon={[
                  "Team plans (up to 3 people)",
                  "Voice input for brain dumps",
                ]}
                onSelect={() => handleChangeTier("pro_plus")}
                loading={tierLoading}
              />
            </div>

            <p className="text-xs text-text-tertiary mt-4">
              Payment processing coming soon. Tiers are switchable for testing.
            </p>
          </section>

          {/* Section 3: Learning & Feedback */}
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
                disabled={learnLoading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  learnEnabled ? "bg-primary" : "bg-border"
                } ${learnLoading ? "opacity-50" : ""}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    learnEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Section 4: Data */}
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

          {/* Section 4: Help */}
          <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6 mb-8">
            <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
              <HelpCircle size={20} className="text-primary" />
              Help
            </h2>

            <div className="space-y-3">
              <a
                href="mailto:support@planscope.co"
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <ExternalLink size={14} />
                Email support
              </a>
              <a
                href="/privacy"
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <ExternalLink size={14} />
                Privacy policy
              </a>
              <a
                href="/terms"
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <ExternalLink size={14} />
                Terms of use
              </a>
            </div>
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
            Type <span className="text-error font-semibold">DELETE</span> to
            confirm.
          </p>
          <Input
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
    </div>
  );
}

function TierCard({
  name,
  price,
  priceSub,
  tier,
  current,
  features,
  comingSoon,
  onSelect,
  loading,
  accent,
}: {
  name: string;
  price: string;
  priceSub?: string;
  tier: string;
  current: boolean;
  features: string[];
  comingSoon?: string[];
  onSelect: () => void;
  loading: boolean;
  accent?: boolean;
}) {
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
        <div>
          <h3 className="font-semibold text-text font-display">{name}</h3>
          <p className="text-sm text-text-secondary">
            {price}
            {priceSub && (
              <span className="text-xs text-text-tertiary ml-1">
                ({priceSub})
              </span>
            )}
          </p>
        </div>
        {current ? (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
            Current plan
          </span>
        ) : (
          <Button
            size="sm"
            variant={accent ? "primary" : "secondary"}
            onClick={onSelect}
            loading={loading}
          >
            {tier === "free" ? "Downgrade" : "Upgrade"}
          </Button>
        )}
      </div>
      <ul className="space-y-1 mt-3">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 text-sm text-text-secondary"
          >
            <CheckIcon size={14} className="text-primary flex-shrink-0" />
            {f}
          </li>
        ))}
        {comingSoon?.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 text-sm text-text-tertiary"
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
