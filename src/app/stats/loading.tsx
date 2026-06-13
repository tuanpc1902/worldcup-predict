import { SkeletonBox } from '@/components/Skeleton'

export default function StatsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <SkeletonBox className="h-8 w-44" />
        <SkeletonBox className="h-4 w-60 rounded-full" />
      </div>
      {/* Overview grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <SkeletonBox className="h-3 w-20 rounded" />
            <SkeletonBox className="h-9 w-14 rounded" />
            <SkeletonBox className="h-3 w-8 rounded" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <SkeletonBox className="h-5 w-40 rounded" />
        <SkeletonBox className="h-48 w-full rounded-xl" />
      </div>
      {/* Recent list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <SkeletonBox className="h-5 w-36 rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
            <SkeletonBox className="h-4 flex-1 rounded" />
            <SkeletonBox className="h-5 w-12 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
