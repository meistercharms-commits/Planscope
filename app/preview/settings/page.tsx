"use client";

import { Mail, CreditCard, Download, Trash2, Brain } from "lucide-react";
import Button from "@/components/ui/Button";

export default function SettingsPreviewPage() {
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
          {/* Account Section */}
          <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
              <Mail size={20} className="text-primary" />
              Account
            </h2>

            <p className="text-sm text-text-secondary mb-4">
              Signed in as <span className="font-medium text-text">you@example.com</span>
            </p>

            <button className="text-sm text-primary hover:underline font-medium cursor-pointer">
              Change email address
            </button>

            <div className="mt-4 pt-4 border-t border-border">
              <button className="text-sm text-primary hover:underline font-medium cursor-pointer">
                Change password
              </button>
            </div>
          </section>

          {/* Tier Section */}
          <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              Plan
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-secondary mb-2">Current tier</p>
                <p className="text-lg font-semibold text-text">Pro</p>
              </div>
              <p className="text-xs text-text-secondary">
                You can create up to 8 plans per month. 5 remaining this month.
              </p>
              <div className="flex gap-2 flex-wrap pt-2">
                <Button size="sm" variant="secondary">
                  Free
                </Button>
                <Button size="sm">
                  Pro
                </Button>
                <Button size="sm" variant="secondary">
                  Pro Plus
                </Button>
              </div>
            </div>
          </section>

          {/* Learning Section */}
          <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
              <Brain size={20} className="text-primary" />
              Learning & Feedback
            </h2>

            <p className="text-sm text-text-secondary mb-4">
              Let Planscope learn from your planning patterns
            </p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm text-text">
                When enabled, the app uses your completion history to improve recommendations. No data is shared.
              </span>
            </label>
          </section>

          {/* Data Section */}
          <section className="bg-bg-card rounded-lg shadow-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-text font-display mb-4 flex items-center gap-2">
              <Download size={20} className="text-primary" />
              Data
            </h2>

            <div className="space-y-4">
              <div>
                <Button variant="secondary" size="sm">
                  <Download size={16} className="mr-2" />
                  Export my data
                </Button>
                <p className="text-xs text-text-secondary mt-2">
                  Download a copy of all your data in JSON format.
                </p>
              </div>

              <div className="h-px bg-border" />

              <div>
                <Button variant="danger" size="sm">
                  <Trash2 size={16} className="mr-2" />
                  Delete account
                </Button>
                <p className="text-xs text-text-secondary mt-2">
                  Permanently delete your account and all associated data.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
