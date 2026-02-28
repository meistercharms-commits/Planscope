import { SkeletonText, SkeletonTaskCard } from "@/components/ui/Skeleton";

export default function PlanLoading() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <SkeletonText width="55%" height={22} className="mb-2" />
        <SkeletonText width="40%" height={12} className="mb-1" />
        <SkeletonText width="35%" height={12} />
      </div>
      <div className="space-y-3">
        <SkeletonTaskCard />
        <SkeletonTaskCard />
        <SkeletonTaskCard />
        <SkeletonTaskCard />
      </div>
    </div>
  );
}
