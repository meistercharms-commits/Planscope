import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-bg">
      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-6">
        <span className="text-2xl">🔍</span>
      </div>
      <h1 className="text-xl font-bold text-text font-display mb-2">
        Page not found
      </h1>
      <p className="text-sm text-text-secondary text-center mb-6 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
