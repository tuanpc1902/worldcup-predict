import { SkeletonBox } from '@/components/Skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <SkeletonBox className="h-8 w-36" />
          <SkeletonBox className="h-4 w-28 rounded-full" />
        </div>
        <SkeletonBox className="h-9 w-32 rounded-lg" />
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2">
        {[48, 64, 56].map((w, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-full animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="h-10 bg-slate-50 border-b border-slate-100" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 last:border-0">
            <SkeletonBox className="h-4 w-6 rounded flex-shrink-0" />
            <SkeletonBox className="h-6 w-6 rounded flex-shrink-0" />
            <SkeletonBox className="h-4 w-24 rounded" />
            <SkeletonBox className="h-4 w-4 rounded mx-1" />
            <SkeletonBox className="h-6 w-6 rounded flex-shrink-0" />
            <SkeletonBox className="h-4 w-24 rounded" />
            <div className="ml-auto flex gap-2 flex-shrink-0">
              <SkeletonBox className="h-6 w-16 rounded-full" />
              <SkeletonBox className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
