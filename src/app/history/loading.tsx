import { SkeletonBox } from '@/components/Skeleton'

export default function HistoryLoading() {
  return (
    <div className="space-y-6">
      <SkeletonBox className="h-8 w-44" />
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <SkeletonBox className="h-3 w-20 rounded" />
            <SkeletonBox className="h-8 w-12 rounded" />
          </div>
        ))}
      </div>
      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <SkeletonBox className="h-5 w-36 rounded" />
        </div>
        <div className="divide-y divide-slate-50">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <SkeletonBox className="h-4 w-6 rounded flex-shrink-0" />
              <SkeletonBox className="h-4 flex-1 rounded" />
              <SkeletonBox className="h-6 w-14 rounded-lg flex-shrink-0" />
              <SkeletonBox className="h-5 w-10 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
