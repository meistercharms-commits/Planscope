import { SkeletonText, SkeletonCard } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <SkeletonText width="40%" height={24} className="mb-2" />
        <SkeletonText width="60%" height={14} />
      </div>
      <SkeletonCard lines={4} />
    </div>
  );
}
