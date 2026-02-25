"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  CreditCard,
  Download,
  Trash2,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/useAuth";

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

  // Redirect anonymous users
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

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

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-text">
                  Current plan: Free
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  All features are currently available.
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => showToast("Coming soon.")}
              >
                Upgrade to Pro
              </Button>

              <p className="text-xs text-text-tertiary">
                Subscription management coming soon.
              </p>
            </div>
          </section>

          {/* Section 3: Data */}
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
