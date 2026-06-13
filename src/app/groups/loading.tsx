import { SkeletonBox } from '@/components/Skeleton'

export default function GroupsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <SkeletonBox className="h-8 w-36" />
          <SkeletonBox className="h-4 w-48 rounded-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="h-9 w-24 rounded-lg" />
          <SkeletonBox className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[280px_1fr]">
        {/* Group list */}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 px-4 py-3 space-y-1.5">
              <SkeletonBox className="h-4 w-32 rounded" />
              <SkeletonBox className="h-3 w-20 rounded" />
            </div>
          ))}
        </div>
        {/* Members list */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <SkeletonBox className="h-5 w-40 rounded" />
          </div>
          <div className="divide-y divide-slate-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <SkeletonBox className="h-4 w-4 rounded" />
                <SkeletonBox className="h-8 w-8 rounded-full flex-shrink-0" />
                <SkeletonBox className="h-4 flex-1 max-w-[160px] rounded" />
                <SkeletonBox className="h-5 w-14 rounded-full ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
