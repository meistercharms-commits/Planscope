"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface Member {
  userId: string;
  email: string;
  role: string;
}

interface SharePlanModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
}

export default function SharePlanModal({
  open,
  onClose,
  planId,
}: SharePlanModalProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchMembers();
      setEmail("");
    }
  }, [open, planId]);

  async function fetchMembers() {
    setFetching(true);
    try {
      const res = await fetch(`/api/plans/${planId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // Silently fail — members list will appear empty
    } finally {
      setFetching(false);
    }
  }

  async function handleShare() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${planId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Couldn't share plan", "error");
        return;
      }

      setEmail("");
      showToast("Plan shared");
      fetchMembers();
    } catch {
      showToast("Something went wrong. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(memberId: string) {
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/plans/${planId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== memberId));
        showToast("Removed");
      } else {
        const data = await res.json();
        showToast(data.error || "Couldn't remove member", "error");
      }
    } catch {
      showToast("Something went wrong. Try again.", "error");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share plan">
      <div className="space-y-5">
        {/* Invite form */}
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Share this plan with other Planscope users. They&apos;ll be able to
            view and complete tasks.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleShare();
                }}
              />
            </div>
            <Button
              onClick={handleShare}
              loading={loading}
              disabled={!email.trim() || loading}
              size="md"
            >
              <UserPlus size={16} className="mr-1.5" />
              Share
            </Button>
          </div>
        </div>

        {/* Current members */}
        {fetching ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Shared with ({members.length}/3)
            </p>
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between py-2 px-3 bg-bg-subtle rounded-lg"
              >
                <span className="text-sm text-text truncate">
                  {member.email}
                </span>
                <button
                  onClick={() => handleRemove(member.userId)}
                  disabled={removing === member.userId}
                  className="p-1 text-text-tertiary hover:text-text transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50"
                  aria-label={`Remove ${member.email}`}
                >
                  {removing === member.userId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <X size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
