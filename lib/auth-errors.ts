const friendlyMessages: Record<string, string> = {
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password. Please try again.",
  "auth/user-not-found": "No account found with that email.",
  "auth/email-already-in-use": "An account with that email already exists.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Please check your connection.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method.",
  "auth/credential-already-in-use": "This credential is already linked to another account.",
  "auth/requires-recent-login": "For security, please log out and log back in before making this change.",
};

export function humanizeAuthError(error: unknown): string {
  if (!error || typeof error !== "object") return "Something went wrong. Please try again.";

  const code = (error as { code?: string }).code;
  if (code && friendlyMessages[code]) return friendlyMessages[code];

  const message = (error as Error).message || "";
  // Firebase wraps codes in the message like "Firebase: Error (auth/wrong-password)."
  for (const [key, friendly] of Object.entries(friendlyMessages)) {
    if (message.includes(key)) return friendly;
  }

  return "Something went wrong. Please try again.";
}
