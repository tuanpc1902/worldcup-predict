import { CommentSkeleton, SkeletonBox } from '@/components/Skeleton'

export default function MatchDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      <SkeletonBox className="h-4 w-20 mt-2" />
      {/* Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex justify-between">
          <SkeletonBox className="h-5 w-28 rounded-full" />
          <SkeletonBox className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            <SkeletonBox className="w-20 h-14 rounded" />
            <SkeletonBox className="h-4 w-24 rounded" />
          </div>
          <SkeletonBox className="w-24 h-14 rounded-2xl" />
          <div className="flex-1 flex flex-col items-center gap-2">
            <SkeletonBox className="w-20 h-14 rounded" />
            <SkeletonBox className="h-4 w-24 rounded" />
          </div>
        </div>
      </div>
      {/* Prediction */}
      <SkeletonBox className="h-24 rounded-2xl" />
      {/* Comments */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <SkeletonBox className="h-5 w-32 rounded" />
        {[...Array(3)].map((_, i) => <CommentSkeleton key={i} />)}
      </div>
    </div>
  )
}
