import { SkeletonBox } from '@/components/Skeleton'

function StandingsTableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="h-10 bg-slate-50 border-b border-slate-100 px-4 flex items-center gap-2">
        <SkeletonBox className="h-4 w-20" />
      </div>
      <div className="divide-y divide-slate-50">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <SkeletonBox className="h-4 w-4 rounded" />
            <SkeletonBox className="h-6 w-8 rounded" />
            <SkeletonBox className="h-4 w-24 rounded" />
            <div className="ml-auto flex gap-3">
              {[...Array(6)].map((_, j) => <SkeletonBox key={j} className="h-4 w-6 rounded" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StandingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 w-44 bg-slate-200 rounded animate-pulse" />
      <div className="flex gap-1">
        <div className="h-9 w-24 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {[...Array(4)].map((_, i) => <StandingsTableSkeleton key={i} />)}
      </div>
    </div>
  )
}
